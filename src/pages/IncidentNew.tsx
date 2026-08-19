import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, Mic, Square, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AppLayout } from "@/components/AppLayout";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DICTATION_LANGUAGES, useDictation } from "@/hooks/useDictation";
import { DICTATION_HINT_COPY, getDictationHintTone } from "@/lib/dictationHintCopy";
import { relabelCapturedPhotos } from "@/lib/capturedPhotoNaming";
import { buildEvidenceStoragePath, removeEvidenceFile, uploadEvidenceFile } from "@/lib/evidenceStorage";
import { readLiveIncidentState } from "@/lib/liveIncident";
import { buildIncidentDraftFromLiveEvents, loadLiveIncidentEvents } from "@/lib/liveIncidentEvents";
import { toast } from "sonner";
import { canCreateIncident, FREE_INCIDENT_LIMIT_MESSAGE } from "@/lib/planLimits";
import { trackProductEvent } from "@/lib/productAnalytics";
import { MAX_EVIDENCE_ITEMS_PER_INCIDENT } from "@/lib/evidenceLimits";
import { createSubmissionGuard } from "@/features/recording-v2/recordingUtils";

function localDT() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const IncidentNew = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const { user, hasPaidAccess } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  const [title, setTitle] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDT());
  const [location, setLocation] = useState("");
  const [peopleStr, setPeopleStr] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadedLiveDraft, setLoadedLiveDraft] = useState(false);
  const [liveSourceSessionId, setLiveSourceSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const submissionGuardRef = useRef(createSubmissionGuard());

  const { isDictating, language, setLanguage, toggle: toggleDictation } = useDictation({
    onTranscript: (transcript) => {
      setNarrative((prev) => (prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript));
    },
    onError: (message) => toast.error(message),
  });

  useEffect(() => {
    if (!user || !caseId || loadedLiveDraft) return;

    const sessionFromQuery = searchParams.get("liveSession");
    const sessionFromState = readLiveIncidentState()?.sessionId;
    const sessionId = sessionFromQuery ?? sessionFromState;
    if (!sessionId) {
      setLoadedLiveDraft(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const events = await loadLiveIncidentEvents(user.id, sessionId);
        if (cancelled) return;
        if (!events.length) {
          setLoadedLiveDraft(true);
          return;
        }

        const draft = buildIncidentDraftFromLiveEvents(events);

        setTitle((prev) => prev || draft.title);
        setOccurredAt((prev) => (prev === localDT() ? draft.occurredAt : prev));
        setPeopleStr((prev) => prev || draft.peopleCsv);
        setTagsStr((prev) => prev || draft.tagsCsv);
        setNarrative((prev) => prev || draft.narrative);
        setLiveSourceSessionId(sessionId);

        toast.success("Live session imported", {
          description: "Draft incident fields were prefilled from your live timeline.",
        });
      } catch {
        // Non-blocking; form still works manually.
      } finally {
        if (!cancelled) setLoadedLiveDraft(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, caseId, searchParams, loadedLiveDraft]);

  const addFiles = (incoming: File[], source: "camera" | "files" = "files") => {
    if (!incoming.length) return;
    if (source === "camera") {
      const renamed = relabelCapturedPhotos(incoming, {
        timestamp: new Date(),
        location: location || null,
      });
      setFiles((prev) => {
        const remaining = MAX_EVIDENCE_ITEMS_PER_INCIDENT - prev.length;
        if (remaining <= 0) {
          toast.error(`Maximum ${MAX_EVIDENCE_ITEMS_PER_INCIDENT} evidence items per incident`);
          return prev;
        }

        const accepted = renamed.slice(0, remaining);

        if (accepted.length < renamed.length) {
          toast.warning(`Only ${remaining} more evidence item${remaining === 1 ? "" : "s"} can be added`);
        }

        return [...prev, ...accepted];
      });
      return;
    }
    setFiles((prev) => {
      const remaining = MAX_EVIDENCE_ITEMS_PER_INCIDENT - prev.length;

      if (remaining <= 0) {
        toast.error(`Maximum ${MAX_EVIDENCE_ITEMS_PER_INCIDENT} evidence items per incident`);
        return prev;
      }

      const accepted = incoming.slice(0, remaining);

      if (accepted.length < incoming.length) {
        toast.warning(`Only ${remaining} more evidence item${remaining === 1 ? "" : "s"} can be added`);
      }

      return [...prev, ...accepted];
    });
  };

  const submit = async () => {
    if (!title.trim() || !narrative.trim()) {
      toast.error("Title and narrative are required");
      return;
    }
    if (!caseId || !user) {
      toast.error("Missing case or user context");
      return;
    }

    if (!submissionGuardRef.current.begin()) {
      return;
    }

    setSaving(true);
    try {
      if (!hasPaidAccess) {
        const { count, error: countError } = await supabase
          .from("incidents")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        if (countError) throw new Error("Your Free plan usage could not be verified. Please try again.");
        if (!canCreateIncident(count ?? 0, false)) {
          toast.error("Free plan limit reached", { description: FREE_INCIDENT_LIMIT_MESSAGE });
          return;
        }
      }

      const people = peopleStr.split(",").map((s) => s.trim()).filter(Boolean);
      const tags = tagsStr.split(",").map((s) => s.trim()).filter(Boolean);

      const incidentId = incidentIdRef.current;

      let { data, error } = await supabase.from("incidents").insert({
        id: incidentId,
        case_id: caseId,
        user_id: user.id,
        title: title.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        location: location.trim() || null,
        people_involved: people,
        tags,
        ai_analysis: liveSourceSessionId
          ? {
              _source: "live-session",
              _live_session_id: liveSourceSessionId,
            }
          : null,
        raw_narrative: narrative.trim(),
      }).select().single();

      if (error?.code === "23505") {
        const recovered = await supabase
          .from("incidents")
          .select("*")
          .eq("id", incidentId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!recovered.error && recovered.data) {
          data = recovered.data;
          error = null;
        }
      }

      if (error || !data) {
        toast.error(error?.message ?? "Failed to save incident. Check the case and try again.");
        return;
      }

      const { count: totalIncidentCountAfterSave, error: milestoneCountError } = await supabase
        .from("incidents")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (milestoneCountError) {
        console.warn("Could not calculate incident milestone", milestoneCountError.message);
      } else {
        const total = totalIncidentCountAfterSave ?? 0;

        if (total === 1) {
          void trackProductEvent("first_incident_created", {
            case_id: caseId,
          });
        }

        if (total === 3) {
          void trackProductEvent("third_incident_created", {
            case_id: caseId,
          });
        }
      }

      if (files.length) {
        const evidenceRows: Array<{
          incident_id: string;
          user_id: string;
          type: string;
          filename: string;
          storage_path: string | null;
          description: string | null;
        }> = [];
        let uploadFailures = 0;

        for (const f of files) {
          const type = f.type.split("/")[0] || "file";
          const path = buildEvidenceStoragePath({
            userId: user.id,
            caseId,
            incidentId: data.id,
            fileName: f.name,
          });

          try {
            await uploadEvidenceFile(f, path);
            evidenceRows.push({
              incident_id: data.id,
              user_id: user.id,
              type,
              filename: f.name,
              storage_path: path,
              description: null,
            });
          } catch (uploadError) {
            uploadFailures += 1;
            evidenceRows.push({
              incident_id: data.id,
              user_id: user.id,
              type,
              filename: f.name,
              storage_path: null,
              description: uploadError instanceof Error ? `Upload failed: ${uploadError.message}` : "Upload failed",
            });
          }
        }

        const { error: evidenceInsertError } = await supabase.from("evidence_items").insert(evidenceRows);
        if (evidenceInsertError) {
          const uploadedPaths = evidenceRows
            .map((row) => row.storage_path)
            .filter((path): path is string => Boolean(path));

          const cleanupResults = await Promise.allSettled(
            uploadedPaths.map((path) => removeEvidenceFile(path)),
          );

          const cleanupFailures = cleanupResults.filter(
            (result) => result.status === "rejected",
          ).length;

          if (cleanupFailures > 0) {
            console.error("Evidence cleanup incomplete after metadata failure", {
              incidentId: data.id,
              cleanupFailures,
            });
          }

          toast.error("Incident saved, but evidence could not be attached.", {
            description:
              cleanupFailures > 0
                ? "Some uploaded files could not be cleaned up automatically. Please contact support."
                : "Uploaded files were safely cleaned up. You can retry attaching them from the incident.",
          });

          nav(`/incidents/${data.id}`);
          return;
        }

        if (uploadFailures > 0) {
          toast.warning(`Incident saved with ${uploadFailures} upload issue${uploadFailures === 1 ? "" : "s"}`, {
            description: "Some files could not be uploaded to secure storage. Check attached evidence details.",
          });
        }
      }

      toast.success("Incident saved", {
        description: "Timeline updated. Review the record or run AI analysis next.",
        action: { label: "View case", onClick: () => nav(`/cases/${caseId}`) },
      });
      nav(`/incidents/${data.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while saving incident.";
      console.error("Incident save failed unexpectedly", error);
      toast.error("Incident could not be saved", { description: message });
    } finally {
      submissionGuardRef.current.reset();
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-3xl">
        <Link
          to={`/cases/${caseId}`}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to case
        </Link>

        <h1 className="text-3xl md:text-4xl mb-2">New Incident</h1>
        <p className="text-sm text-muted-foreground mb-8">Write it down now. AI will structure it on the next screen.</p>

        {/* Voice capture — primary CTA */}
        <div className="rounded-lg border border-border bg-card p-8 mb-6 text-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
            Tell Proof what happened
          </p>
          <button
            type="button"
            onClick={toggleDictation}
            className={[
              "inline-flex items-center justify-center gap-3 rounded-lg px-8 py-5 text-base font-semibold transition-all w-full md:w-auto",
              isDictating
                ? "bg-destructive/15 border border-destructive text-destructive hover:bg-destructive/20"
                : "bg-accent text-white hover:bg-accent/90 shadow-elevated",
            ].join(" ")}
          >
            {isDictating ? (
              <>
                <Square className="h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Start Recording
              </>
            )}
          </button>
          {isDictating && (
            <p className="mt-3 text-xs text-muted-foreground animate-pulse">
              Listening… speak naturally about what happened.
            </p>
          )}
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Language:</span>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-7 w-[140px] text-xs bg-background border-border">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {DICTATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {DICTATION_HINT_COPY[getDictationHintTone()].incident}
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-card space-y-5">
          <div>
            <Label htmlFor="inc-title">Incident title <span className="text-destructive">*</span></Label>
            <Input
              id="inc-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Missed pickup, June 3"
              className="mt-1.5 bg-background border-border"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inc-dt">Date &amp; time</Label>
              <Input
                id="inc-dt"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="mt-1.5 bg-background border-border"
              />
            </div>
            <div>
              <Label htmlFor="inc-loc">Location (optional)</Label>
              <Input
                id="inc-loc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. 123 Main St"
                className="mt-1.5 bg-background border-border"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="inc-people">People involved (comma-separated)</Label>
            <Input
              id="inc-people"
              value={peopleStr}
              onChange={(e) => setPeopleStr(e.target.value)}
              placeholder="e.g. John Smith, Sarah Lee"
              className="mt-1.5 bg-background border-border"
            />
          </div>

          <div>
            <Label htmlFor="inc-narrative">
              What happened? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="inc-narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="In your own words — what was said, what you saw, dates and times. No filtering needed."
              rows={9}
              className="mt-1.5 bg-background border-border font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="inc-tags">Tags (comma-separated)</Label>
            <Input
              id="inc-tags"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="e.g. text-message, promise, missed-payment"
              className="mt-1.5 bg-background border-border"
            />
          </div>

          {/* Evidence */}
          <div>
            <Label>Attach evidence (optional)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => cameraInputRef.current?.click()}
                className="border-border"
              >
                <Camera className="mr-2 h-4 w-4" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="border-border"
              >
                <Upload className="mr-2 h-4 w-4" />
                Attach Files
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []), "camera")}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
              />
            </div>

            <label className="mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center cursor-pointer hover:bg-muted/30 transition">
              <Upload className="h-5 w-5 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Drop photos, screenshots, documents, audio, or video</span>
              <input type="file" multiple className="hidden" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
            </label>

            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded bg-muted/30 px-3 py-2 text-sm">
                    <span className="truncate text-foreground">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => setFiles(files.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted-foreground hover:text-foreground ml-2"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Disclaimer />

          <div className="flex justify-end gap-2 pt-2">
            <Link to={`/cases/${caseId}`}>
              <Button variant="outline" className="border-border">Cancel</Button>
            </Link>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-white font-semibold min-w-[140px]"
            >
              {saving ? "Saving…" : "Save Incident"}
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default IncidentNew;

