import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, type Category } from "@/lib/categories";
import { relabelCapturedPhotos } from "@/lib/capturedPhotoNaming";
import { buildEvidenceStoragePath, uploadEvidenceFile } from "@/lib/evidenceStorage";
import { clearLiveIncidentState, writeLiveIncidentState } from "@/lib/liveIncident";
import { persistLiveIncidentEvent } from "@/lib/liveIncidentEvents";
import { DICTATION_LANGUAGES, useDictation } from "@/hooks/useDictation";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { CaptureContextPanel } from "./components/CaptureContextPanel";
import { CaptureModeSelector } from "./components/CaptureModeSelector";
import { DocumentationStrength } from "./components/DocumentationStrength";
import { EvidenceCaptureTray } from "./components/EvidenceCaptureTray";
import { IncidentDetailsPanel } from "./components/IncidentDetailsPanel";
import { LiveCapturePanel } from "./components/LiveCapturePanel";
import { RecordingErrorState } from "./components/RecordingErrorState";
import { RecordingExitDialog } from "./components/RecordingExitDialog";
import { RecordingHeader } from "./components/RecordingHeader";
import { RecordingSkeleton } from "./components/RecordingSkeleton";
import { ReviewBeforeSave } from "./components/ReviewBeforeSave";
import {
  buildNarrativeFromEvents,
  calculateDocumentationStrength,
  createDraftFromState,
  createSubmissionGuard,
  dedupeEvidenceItems,
  defaultTitleFromNarrative,
  localDateTimeInputValue,
  parseRecordQuery,
  summarizeEvidenceUploadResult,
  validateRequiredFields,
} from "./recordingUtils";
import {
  RECORDING_DRAFT_STORAGE_KEY,
  applyDraftToState,
  createEmptyRecordingState,
  parseRecordingDraft,
  serializeRecordingDraft,
} from "./recordingState";
import type { PendingEvidenceItem, RecordingCaseRow, RecordingFormState, SaveProgress, TranscriptEvent } from "./types";
import {
  canCreateCase,
  canCreateIncident,
  FREE_CASE_LIMIT_MESSAGE,
  FREE_INCIDENT_LIMIT_MESSAGE,
} from "@/lib/planLimits";
import { trackProductEvent } from "@/lib/productAnalytics";

const STAGES: RecordingFormState["stage"][] = ["capture", "context", "review", "save"];
const submissionGuard = createSubmissionGuard();

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export const RecordingV2 = () => {
  const { user, hasPaidAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryCaseId = parseRecordQuery(location.search).caseId;
  const [cases, setCases] = useState<RecordingCaseRow[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [caseLoadError, setCaseLoadError] = useState<string | null>(null);
  const [state, setState] = useState<RecordingFormState>(() => createEmptyRecordingState("Other", queryCaseId));
  const [draftStatus, setDraftStatus] = useState<"clean" | "unsaved" | "saved-locally" | "saving" | "saved">("clean");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgress>({ state: "idle", message: "Ready" });
  const [createCaseOpen, setCreateCaseOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseCategory, setNewCaseCategory] = useState<Category>("Other");
  const [newCaseDescription, setNewCaseDescription] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);
  const sessionIdRef = useRef(createId("live-session"));

  const finalNarrative = useMemo(() => buildNarrativeFromEvents(state.transcriptEvents, state.narrative), [state.narrative, state.transcriptEvents]);
  const selectedCase = useMemo(() => cases.find((caseRow) => caseRow.id === state.caseId), [cases, state.caseId]);
  const strength = useMemo(
    () => calculateDocumentationStrength({
      title: state.title,
      occurredAt: state.occurredAt,
      location: state.location,
      people: state.people,
      narrative: finalNarrative,
      evidenceCount: state.evidenceItems.length,
      category: state.category,
    }),
    [finalNarrative, state.category, state.evidenceItems.length, state.location, state.occurredAt, state.people, state.title],
  );

  const updateState = (patch: Partial<RecordingFormState>) => {
    setState((current) => ({ ...current, ...patch }));
    setDraftStatus("unsaved");
  };

  const openCreateCaseDialog = () => {
    setNewCaseTitle((current) => current || state.title.trim() || "");
    setNewCaseCategory(state.category || "Other");
    setCreateCaseOpen(true);
  };

  const createCaseForRecording = async () => {
    if (!user || !newCaseTitle.trim()) return;
    if (!canCreateCase(cases.length, hasPaidAccess)) {
      void trackProductEvent("case_limit_reached", {
        source: "recording_v2",
        current_case_count: cases.length,
      });
      toast.error("Free plan case limit reached", { description: FREE_CASE_LIMIT_MESSAGE });
      return;
    }
    setCreatingCase(true);
    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: user.id,
        title: newCaseTitle.trim(),
        category: newCaseCategory,
        description: newCaseDescription.trim() || null,
      })
      .select("id, title, category, updated_at")
      .single();

    setCreatingCase(false);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create case.");
      return;
    }

    const createdCase = data as RecordingCaseRow;
    setCases((current) => [createdCase, ...current.filter((caseRow) => caseRow.id !== createdCase.id)]);
    updateState({ caseId: createdCase.id, category: (createdCase.category as Category | null) ?? newCaseCategory });
    setNewCaseTitle("");
    setNewCaseDescription("");
    setCreateCaseOpen(false);
    toast.success("Case created", { description: "This incident will be saved under the new case." });
  };

  const addTranscriptEvent = async (event: Omit<TranscriptEvent, "id">) => {
    const nextEvent = { ...event, id: createId(event.type) };
    setState((current) => ({
      ...current,
      transcriptEvents: [...current.transcriptEvents, nextEvent],
      title: current.title.trim() || (event.type === "transcript" ? defaultTitleFromNarrative(event.text) : current.title),
    }));
    setDraftStatus("unsaved");
    if (user) {
      try {
        await persistLiveIncidentEvent({
          userId: user.id,
          sessionId: sessionIdRef.current,
          type: event.type === "location" ? "note" : event.type,
          text: event.text,
          occurredAt: event.occurredAt,
        });
      } catch (error) {
        console.warn("Failed to persist live capture event", error);
      }
    }
  };

  const { isSupported: isDictationSupported, isDictating, language, setLanguage, toggle: toggleDictation, stop: stopDictation } = useDictation({
    onTranscript: (transcript) => {
      setDictationError(null);
      void addTranscriptEvent({ type: "transcript", text: transcript, occurredAt: new Date().toISOString() });
    },
    onError: (message) => setDictationError(message),
  });

  const {
    isSupported: isAudioRecordingSupported,
    isRecording: isAudioRecording,
    toggle: toggleAudioRecording,
    stop: stopAudioRecording,
  } = useAudioRecorder({
    onRecordingComplete: (file) => {
      const capturedAt = new Date().toISOString();
      const evidenceItem: PendingEvidenceItem = {
        id: createId("voice"),
        file,
        filename: file.name,
        type: "audio",
        capturedAt,
        source: "voice",
        status: "pending",
      };
      const transcriptEvent: TranscriptEvent = {
        id: createId("note"),
        type: "note",
        text: `Voice recording captured: ${file.name}`,
        occurredAt: capturedAt,
      };
      setState((current) => ({
        ...current,
        evidenceItems: dedupeEvidenceItems([...current.evidenceItems, evidenceItem]),
        transcriptEvents: [...current.transcriptEvents, transcriptEvent],
      }));
      setDraftStatus("unsaved");
      setDictationError(null);
      toast.success("Voice recording attached", { description: "The audio file will upload when you save the incident." });
      if (user) {
        void persistLiveIncidentEvent({
          userId: user.id,
          sessionId: sessionIdRef.current,
          type: "note",
          text: transcriptEvent.text,
          occurredAt: capturedAt,
        }).catch((error) => console.warn("Failed to persist voice recording event", error));
      }
    },
    onError: (message) => setDictationError(message),
  });

  const isVoiceRecording = isDictating || isAudioRecording;
  const isVoiceCaptureSupported = isDictationSupported || isAudioRecordingSupported;
  const isAudioFallback = !isDictationSupported && isAudioRecordingSupported;

  const toggleVoiceCapture = () => {
    setDictationError(null);
    if (!isVoiceRecording) setElapsedSeconds(0);
    if (isDictationSupported) {
      toggleDictation();
      return;
    }
    if (isAudioRecordingSupported) {
      toggleAudioRecording();
      return;
    }
    setDictationError("Voice capture is not supported in this browser. Use Type mode to capture the incident.");
  };

  useEffect(() => {
    if (!isVoiceRecording) return;
    const startedAt = Date.now() - elapsedSeconds * 1000;
    const interval = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [elapsedSeconds, isVoiceRecording]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoadingCases(true);
      setCaseLoadError(null);
      const { data, error } = await supabase
        .from("cases")
        .select("id, title, category, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (cancelled) return;
      if (error) {
        console.error("Failed to load recording cases", error);
        setCaseLoadError("Cases could not be loaded. Check your connection and try again.");
        setLoadingCases(false);
        return;
      }

      const rows = (data as RecordingCaseRow[] | null) ?? [];
      setCases(rows);
      setState((current) => {
        const validCaseIds = new Set(rows.map((row) => row.id));
        const nextCaseId =
          (queryCaseId && validCaseIds.has(queryCaseId) ? queryCaseId : "") ||
          (current.caseId && validCaseIds.has(current.caseId) ? current.caseId : "") ||
          (rows.length === 1 ? rows[0].id : "");
        const selected = rows.find((row) => row.id === nextCaseId);
        return { ...current, caseId: nextCaseId, category: (selected?.category as Category | undefined) ?? current.category };
      });
      setLoadingCases(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [queryCaseId, user]);

  useEffect(() => {
    const parsed = parseRecordingDraft(globalThis.localStorage?.getItem(RECORDING_DRAFT_STORAGE_KEY) ?? null);
    if (!parsed) return;
    setState((current) => applyDraftToState(parsed, current));
    setDraftStatus("saved-locally");
    toast.info("Local recording draft restored", {
      description: "Text and metadata were restored. Pending files are not stored across refreshes.",
    });
  }, []);

  useEffect(() => {
    if (draftStatus !== "unsaved") return;
    const timeout = window.setTimeout(() => {
      const draft = createDraftFromState(state);
      globalThis.localStorage?.setItem(RECORDING_DRAFT_STORAGE_KEY, serializeRecordingDraft(draft));
      setDraftStatus("saved-locally");
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [draftStatus, state]);

  useEffect(() => {
    writeLiveIncidentState({ active: true, startedAt: new Date().toISOString(), sessionId: sessionIdRef.current });
    return () => clearLiveIncidentState();
  }, []);

  const handleFiles = (files: File[], source: "camera" | "files") => {
    if (!files.length) return;
    const prepared = source === "camera" ? relabelCapturedPhotos(files, { location: state.location || null, timestamp: new Date() }) : files;
    const nextItems = prepared.map<PendingEvidenceItem>((file) => ({
      id: createId("evidence"),
      file,
      filename: file.name,
      type: file.type.split("/")[0] || "file",
      capturedAt: new Date().toISOString(),
      source,
      status: "pending",
    }));
    const deduped = dedupeEvidenceItems([...state.evidenceItems, ...nextItems]);
    updateState({ evidenceItems: deduped });
    nextItems.forEach((item) => {
      void addTranscriptEvent({ type: "photo", text: `Evidence captured: ${item.filename}`, occurredAt: item.capturedAt });
    });
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser. Enter the location manually.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
        updateState({ location: value, locationCapturedAt: new Date().toISOString() });
        void addTranscriptEvent({ type: "location", text: `Location captured: ${value}`, occurredAt: new Date().toISOString() });
        setLocationLoading(false);
      },
      (error) => {
        console.warn("Geolocation capture failed", error.code);
        setLocationError(error.code === error.TIMEOUT ? "Location capture timed out. Try again or enter it manually." : "Location permission was denied or unavailable. Enter it manually if needed.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const saveIncident = async () => {
    if (!user) {
      setSaveProgress({ state: "failed", message: "Your session expired. Sign in again before saving." });
      return;
    }
    if (!submissionGuard.begin()) return;

    const selectedSaveCase = cases.find((caseRow) => caseRow.id === state.caseId);
    const validation = validateRequiredFields({ caseId: selectedSaveCase?.id ?? "", title: state.title, narrative: state.narrative, transcriptEvents: state.transcriptEvents });
    if (!validation.valid) {
      submissionGuard.reset();
      setSaveProgress({ state: "failed", message: `Missing required fields: ${validation.missing.join(", ")}.` });
      updateState({ stage: "review" });
      if (!selectedSaveCase) {
        toast.error("Choose or create a case before saving this incident.");
      }
      return;
    }

    try {
      if (!hasPaidAccess) {
        const { count, error: countError } = await supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (countError) throw new Error("Your Free plan usage could not be verified. Please try again.");
        if (!canCreateIncident(count ?? 0, false)) {
          updateState({ stage: "review" });
          setSaveProgress({ state: "failed", message: FREE_INCIDENT_LIMIT_MESSAGE });
          toast.error("Free plan limit reached", { description: FREE_INCIDENT_LIMIT_MESSAGE });
          return;
        }
      }

      updateState({ stage: "save" });
      setSaveProgress({ state: "creating", message: "Creating incident…" });
      const tags = Array.from(new Set([state.category, "live-capture"].filter(Boolean)));
      const { data, error } = await supabase
        .from("incidents")
        .insert({
          case_id: selectedSaveCase.id,
          user_id: user.id,
          title: state.title.trim(),
          occurred_at: new Date(state.occurredAt || localDateTimeInputValue()).toISOString(),
          location: state.location.trim() || null,
          people_involved: state.people,
          tags,
          raw_narrative: finalNarrative.trim(),
          ai_analysis: {
            _source: "recording-v2",
            _live_session_id: sessionIdRef.current,
            _captured_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (error || !data) {
        console.error("Recording V2 incident creation failed", error);
        updateState({ stage: "review" });
        setSaveProgress({ state: "failed", message: error?.message ?? "Incident could not be saved. Check the required fields and try again." });
        toast.error(error?.message ?? "Incident could not be saved. Check the required fields and try again.");
        return;
      }

      const incidentId = data.id as string;
      const uploadResult = { successful: [], failed: [] } as { successful: Array<{ filename: string; storagePath: string; type: string }>; failed: Array<{ filename: string; message: string }> };

      if (state.evidenceItems.length > 0) {
        setSaveProgress({ state: "uploading", message: "Uploading evidence…" });
        for (const item of state.evidenceItems) {
          const path = buildEvidenceStoragePath({ userId: user.id, caseId: selectedSaveCase.id, incidentId, fileName: item.filename });
          try {
            await uploadEvidenceFile(item.file, path);
            uploadResult.successful.push({ filename: item.filename, storagePath: path, type: item.type });
          } catch (error) {
            console.error("Recording V2 evidence upload failed", { filename: item.filename, error });
            uploadResult.failed.push({ filename: item.filename, message: "Upload failed" });
          }
        }

        const evidenceRows = [
          ...uploadResult.successful.map((item) => ({
            incident_id: incidentId,
            user_id: user.id,
            type: item.type,
            filename: item.filename,
            storage_path: item.storagePath,
            description: null,
          })),
          ...uploadResult.failed.map((item) => ({
            incident_id: incidentId,
            user_id: user.id,
            type: "file",
            filename: item.filename,
            storage_path: null,
            description: item.message,
          })),
        ];

        if (evidenceRows.length > 0) {
          setSaveProgress({ state: "associating", message: "Associating evidence…" });
          const { error: evidenceInsertError } = await supabase.from("evidence_items").insert(evidenceRows);
          if (evidenceInsertError) {
            console.error("Recording V2 evidence association failed", evidenceInsertError);
            setSaveProgress({ state: "failed", message: "Incident saved, but evidence association failed. Open the incident to retry evidence attachment." });
            navigate(`/incidents/${incidentId}`);
            return;
          }
        }
      }

      const summary = summarizeEvidenceUploadResult(uploadResult);
      setSaveProgress({ state: summary.state, message: state.evidenceItems.length ? summary.message : "Incident saved." });
      globalThis.localStorage?.removeItem(RECORDING_DRAFT_STORAGE_KEY);
      clearLiveIncidentState();
      setDraftStatus("saved");
      toast.success("Incident saved", {
        description: uploadResult.successful.length > 0
          ? "Evidence uploaded. Run AI Analysis to organize your timeline."
          : "Nice work. Add a photo, message, or document.",
        action: { label: "View case", onClick: () => navigate(`/cases/${selectedSaveCase.id}`) },
      });
      navigate(`/incidents/${incidentId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while saving incident.";
      console.error("Recording V2 incident save failed unexpectedly", error);
      updateState({ stage: "review" });
      setSaveProgress({ state: "failed", message });
      toast.error("Incident could not be saved", { description: message });
    } finally {
      submissionGuard.reset();
    }
  };

  const moveStage = (direction: 1 | -1) => {
    const index = STAGES.indexOf(state.stage);
    const next = STAGES[Math.max(0, Math.min(STAGES.length - 2, index + direction))];
    updateState({ stage: next });
  };

  const handleClose = () => {
    const hasUnsaved = draftStatus === "unsaved" || state.evidenceItems.length > 0 || finalNarrative.trim().length > 0 || state.title.trim().length > 0;
    if (hasUnsaved) {
      setShowExitDialog(true);
      return;
    }
    navigate("/dashboard");
  };

  if (loadingCases) {
    return <AppLayout><RecordingSkeleton /></AppLayout>;
  }

  if (caseLoadError) {
    return <AppLayout><main className="mx-auto max-w-3xl px-4 py-10"><RecordingErrorState title="Cases unavailable" message={caseLoadError} actionLabel="Try again" onAction={() => window.location.reload()} /></main></AppLayout>;
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:px-6 lg:px-10 lg:py-8">
        <RecordingHeader stage={state.stage} selectedCase={selectedCase} draftStatus={draftStatus} onClose={handleClose} />

        <Dialog open={createCaseOpen} onOpenChange={setCreateCaseOpen}>
          <DialogContent className="border-white/10 bg-[#0B111A] text-white">
            <DialogHeader>
              <DialogTitle>Create a case for this incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recording-new-case-title">Case title</Label>
                <Input
                  id="recording-new-case-title"
                  value={newCaseTitle}
                  onChange={(event) => setNewCaseTitle(event.target.value)}
                  placeholder="e.g. Workplace retaliation timeline"
                  className="mt-2 rounded-xl border-white/10 bg-[#050812]"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newCaseCategory} onValueChange={(value) => setNewCaseCategory(value as Category)}>
                  <SelectTrigger className="mt-2 rounded-xl border-white/10 bg-[#050812]"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="recording-new-case-description">Description (optional)</Label>
                <Textarea
                  id="recording-new-case-description"
                  value={newCaseDescription}
                  onChange={(event) => setNewCaseDescription(event.target.value)}
                  placeholder="Briefly describe what this case is about."
                  rows={3}
                  className="mt-2 rounded-xl border-white/10 bg-[#050812]"
                />
              </div>
              <Button type="button" onClick={createCaseForRecording} disabled={creatingCase || !newCaseTitle.trim()} className="w-full rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                {creatingCase ? "Creating…" : "Create case and continue recording"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {cases.length === 0 ? (
          <RecordingErrorState title="Create a case first" message="Incidents must be saved inside a case. Create one here, then keep recording without leaving this screen." actionLabel="Create new case" onAction={openCreateCaseDialog} />
        ) : (
          <div className="mt-6 space-y-6">
            <CaptureModeSelector
              mode={state.captureMode}
              onChange={(captureMode) => {
                if (captureMode !== "speak") {
                  stopDictation();
                  stopAudioRecording();
                }
                updateState({ captureMode, stage: "capture" });
              }}
            />

            {state.stage === "capture" && (
              <LiveCapturePanel
                mode={state.captureMode}
                narrative={state.narrative}
                transcriptEvents={state.transcriptEvents}
                isDictating={isVoiceRecording}
                isSupported={isVoiceCaptureSupported}
                isAudioFallback={isAudioFallback}
                elapsedLabel={formatElapsed(elapsedSeconds)}
                dictationError={dictationError}
                location={state.location}
                locationError={locationError}
                locationLoading={locationLoading}
                evidenceTray={<EvidenceCaptureTray items={state.evidenceItems} onFiles={handleFiles} onRemove={(id) => updateState({ evidenceItems: state.evidenceItems.filter((item) => item.id !== id) })} />}
                onNarrativeChange={(narrative) => updateState({ narrative, title: state.title || defaultTitleFromNarrative(narrative) })}
                onToggleDictation={() => {
                  toggleVoiceCapture();
                }}
                onRetryDictation={() => {
                  toggleVoiceCapture();
                }}
                onEditTranscriptEvent={(eventId, text) => updateState({ transcriptEvents: state.transcriptEvents.map((event) => event.id === eventId ? { ...event, text } : event) })}
                onCaptureLocation={captureLocation}
                onLocationChange={(nextLocation) => updateState({ location: nextLocation })}
              />
            )}

            {state.stage === "context" && (
              <>
                <CaptureContextPanel
                  cases={cases}
                  caseId={state.caseId}
                  title={state.title}
                  category={state.category}
                  occurredAt={state.occurredAt}
                  location={state.location}
                  people={state.people}
                  onCaseChange={(caseId) => {
                    const selected = cases.find((caseRow) => caseRow.id === caseId);
                    updateState({ caseId, category: (selected?.category as Category | undefined) ?? state.category });
                  }}
                  onTitleChange={(title) => updateState({ title })}
                  onCategoryChange={(category) => updateState({ category })}
                  onOccurredAtChange={(occurredAt) => updateState({ occurredAt })}
                  onLocationChange={(nextLocation) => updateState({ location: nextLocation })}
                  onPeopleChange={(people) => updateState({ people })}
                  onCreateCase={openCreateCaseDialog}
                />
                <IncidentDetailsPanel narrative={state.narrative} onChange={(narrative) => updateState({ narrative })} />
                <EvidenceCaptureTray items={state.evidenceItems} onFiles={handleFiles} onRemove={(id) => updateState({ evidenceItems: state.evidenceItems.filter((item) => item.id !== id) })} />
              </>
            )}

            {state.stage === "review" && (
              <ReviewBeforeSave
                title={state.title}
                selectedCase={selectedCase}
                category={state.category}
                occurredAt={state.occurredAt}
                narrative={finalNarrative}
                location={state.location}
                people={state.people}
                evidenceItems={state.evidenceItems}
                strength={strength}
                onEditSection={(stage) => updateState({ stage })}
              />
            )}

            {state.stage === "save" && <RecordingErrorState title="Saving incident" message={saveProgress.message} actionLabel="View dashboard" onAction={() => navigate("/dashboard")} />}

            <DocumentationStrength strength={strength} />

            <div className="sticky bottom-3 z-20 rounded-2xl border border-white/[0.06] bg-[#0B111A]/95 p-3 backdrop-blur md:static md:bg-transparent md:p-0">
              <div className="flex items-center justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => moveStage(-1)} disabled={state.stage === "capture" || saveProgress.state === "creating" || saveProgress.state === "uploading"} className="rounded-xl border-white/10 bg-white/[0.02]">
                  <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                  Back
                </Button>
                {state.stage === "review" ? (
                  <Button type="button" onClick={saveIncident} disabled={saveProgress.state === "creating" || saveProgress.state === "uploading" || saveProgress.state === "associating"} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    Save Incident
                  </Button>
                ) : (
                  <Button type="button" onClick={() => moveStage(1)} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
              {saveProgress.state !== "idle" && <p className="mt-2 text-center text-xs text-slate-500" aria-live="polite">{saveProgress.message}</p>}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between text-xs text-slate-600">
          <span>Dictation language: {DICTATION_LANGUAGES.find((item) => item.value === language)?.label ?? language}</span>
          <button type="button" onClick={() => setLanguage(language === "en-US" ? "en-GB" : "en-US")} className="font-bold text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Toggle US/UK</button>
        </div>

        <RecordingExitDialog open={showExitDialog} onOpenChange={setShowExitDialog} onConfirm={() => {
          stopDictation();
          stopAudioRecording();
          navigate("/dashboard");
        }} />
      </main>
    </AppLayout>
  );
};

export default RecordingV2;
