import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { playUiTone, triggerHaptic } from "@/lib/feedback";
import { useDictation } from "@/hooks/useDictation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { buildIncidentDraftFromLiveEvents, loadLiveIncidentEvents, persistLiveIncidentEvent, type LiveIncidentEventType } from "@/lib/liveIncidentEvents";
import { clearLiveIncidentState, readLiveIncidentState, writeLiveIncidentState } from "@/lib/liveIncident";

type TimelineEvent = {
  occurredAt: string;
  text: string;
  type: LiveIncidentEventType;
};

const formatTime = (date = new Date()) =>
  date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const getElapsedLabel = (startedAt: Date) => {
  const minutes = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / 60000));
  return `Session started ${minutes} min ago`;
};

const createSessionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
};

export default function StressMode() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const preferredCaseId = searchParams.get("caseId");

  const initialLiveState = readLiveIncidentState();
  const [sessionStartedAt] = useState(() =>
    initialLiveState?.startedAt ? new Date(initialLiveState.startedAt) : new Date(),
  );
  const [sessionId] = useState(() => initialLiveState?.sessionId ?? createSessionId());
  const [recording, setRecording] = useState(() => initialLiveState?.active ?? false);
  const [activeSheet, setActiveSheet] = useState<"witness" | "note" | null>(null);
  const [witnessInput, setWitnessInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [finalizing, setFinalizing] = useState(false);
  const [lastTranscriptPreview, setLastTranscriptPreview] = useState("");

  const screenshotInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const lastTranscriptRef = useRef("");

  const {
    isSupported: isDictationSupported,
    isDictating,
    language,
    setLanguage,
    toggle: toggleDictation,
    stop: stopDictation,
  } = useDictation({
    initialLanguage: "en-US",
    onTranscript: (chunk) => {
      const normalized = chunk.trim().replace(/\s+/g, " ");
      if (!normalized) return;

      setLastTranscriptPreview(normalized);

      if (normalized === lastTranscriptRef.current) return;
      lastTranscriptRef.current = normalized;

      appendEvent(`Voice transcript: “${normalized}”`, "transcript", {
        persist: true,
      });
    },
    onError: (message) => {
      toast.error(message);
    },
  });

  const appendEvent = (
    text: string,
    type: LiveIncidentEventType,
    options?: { metadata?: Record<string, unknown>; occurredAt?: string; persist?: boolean },
  ) => {
    const occurredAt = options?.occurredAt ?? new Date().toISOString();
    const event: TimelineEvent = { occurredAt, text, type };
    setEvents((prev) => [...prev, event].slice(-80));

    if (!options?.persist || !user) return;
    void persistLiveIncidentEvent({
      userId: user.id,
      sessionId,
      type,
      text,
      occurredAt,
      metadata: options.metadata,
    });
  };

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    (async () => {
      try {
        const persisted = await loadLiveIncidentEvents(user.id, sessionId);
        if (cancelled) return;

        if (persisted.length > 0) {
          setEvents(persisted);
          return;
        }

        const seedOccurredAt = sessionStartedAt.toISOString();
        appendEvent("Stress mode activated", "system", {
          occurredAt: seedOccurredAt,
          persist: true,
          metadata: { source: "stress-mode" },
        });
      } catch {
        if (cancelled) return;
        const seedOccurredAt = sessionStartedAt.toISOString();
        appendEvent("Stress mode activated", "system", {
          occurredAt: seedOccurredAt,
          persist: false,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  const onToggleRecording = () => {
    const next = !recording;
    setRecording(next);
    playUiTone(next ? "intelligence" : "click");
    triggerHaptic("light");
    appendEvent(next ? "Voice recording started" : "Voice recording stopped", "system", {
      persist: true,
      metadata: { action: next ? "start" : "stop" },
    });

    if (next) {
      lastTranscriptRef.current = "";
      setLastTranscriptPreview("");
      writeLiveIncidentState({
        active: true,
        startedAt: sessionStartedAt.toISOString(),
        sessionId,
      });

      if (isDictationSupported) {
        if (!isDictating) toggleDictation();
        toast.success("Voice capture + live transcript started");
      } else {
        toast.success("Voice capture started", {
          description: "Live transcript is unavailable in this browser.",
        });
      }
      return;
    }

    if (isDictating) stopDictation();
    lastTranscriptRef.current = "";
    setLastTranscriptPreview("");
    clearLiveIncidentState();
    toast.success("Voice capture stopped");
  };

  const resolveTargetCaseId = async () => {
    if (!user) return null;

    if (preferredCaseId) {
      const { data: explicitCase, error: explicitCaseError } = await supabase
        .from("cases")
        .select("id")
        .eq("id", preferredCaseId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!explicitCaseError && explicitCase?.id) return explicitCase.id;
    }

    const { data: latestCase, error: latestCaseError } = await supabase
      .from("cases")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestCaseError) return null;
    return latestCase?.id ?? null;
  };

  const finalizeSession = async () => {
    if (!user) {
      toast.error("You need to be signed in to finalize this session.");
      return;
    }

    if (!events.length) {
      toast.error("No live session events yet.", {
        description: "Capture at least one transcript or timeline event before finalizing.",
      });
      return;
    }

    setFinalizing(true);

    if (recording) {
      setRecording(false);
      if (isDictating) stopDictation();
      setLastTranscriptPreview("");
      appendEvent("Voice recording stopped", "system", {
        persist: true,
        metadata: { action: "stop-finalize" },
      });
    }
    clearLiveIncidentState();

    const targetCaseId = await resolveTargetCaseId();
    if (!targetCaseId) {
      setFinalizing(false);
      toast.error("No case found for this live session.", {
        description: "Create or open a case first, then finalize again.",
      });
      nav("/dashboard");
      return;
    }

    const draft = buildIncidentDraftFromLiveEvents(events);
    const people = draft.peopleCsv.split(",").map((s) => s.trim()).filter(Boolean);
    const tags = draft.tagsCsv.split(",").map((s) => s.trim()).filter(Boolean);
    const occurredAt = new Date(draft.occurredAt);
    const occurredAtIso = Number.isNaN(occurredAt.getTime()) ? new Date().toISOString() : occurredAt.toISOString();

    const { data, error } = await supabase.from("incidents").insert({
      case_id: targetCaseId,
      user_id: user.id,
      title: draft.title || "Live incident",
      occurred_at: occurredAtIso,
      people_involved: people,
      tags,
      ai_analysis: {
        _source: "live-session",
        _live_session_id: sessionId,
        _live_event_count: events.length,
      },
      raw_narrative: draft.narrative || events.map((event) => `${formatTime(new Date(event.occurredAt))} — ${event.text}`).join("\n"),
    }).select("id").single();

    setFinalizing(false);

    if (error || !data) {
      toast.error(error?.message ?? "Failed to finalize session.");
      return;
    }

    playUiTone("success");
    triggerHaptic("success");
    toast.success("Session finalized", {
      description: "Live session converted into a new incident record.",
    });
    nav(`/incidents/${data.id}`);
  };

  const onScreenshotSelected = (incoming: FileList | null) => {
    const count = incoming?.length ?? 0;
    if (!count) return;
    playUiTone("success");
    triggerHaptic("success");
    appendEvent(count === 1 ? "Screenshot uploaded" : `${count} screenshots uploaded`, "screenshot", {
      persist: true,
      metadata: { count },
    });
    toast.success(count === 1 ? "Screenshot added" : `${count} screenshots added`);
  };

  const onPhotoSelected = (incoming: FileList | null) => {
    const count = incoming?.length ?? 0;
    if (!count) return;
    playUiTone("success");
    triggerHaptic("success");
    appendEvent(count === 1 ? "Photo captured" : `${count} photos captured`, "photo", {
      persist: true,
      metadata: { count },
    });
    toast.success(count === 1 ? "Photo added" : `${count} photos added`);
  };

  const onAddWitness = () => setActiveSheet("witness");

  const onQuickNote = () => setActiveSheet("note");

  const closeSheet = () => {
    setActiveSheet(null);
    setWitnessInput("");
    setNoteInput("");
  };

  const submitWitness = () => {
    const value = witnessInput.trim();
    if (!value) {
      toast.error("Please enter witness details");
      return;
    }
    appendEvent(`Witness added: ${value}`, "witness", {
      persist: true,
    });
    playUiTone("success");
    triggerHaptic("success");
    toast.success("Witness added to timeline");
    closeSheet();
  };

  const submitNote = () => {
    const value = noteInput.trim();
    if (!value) {
      toast.error("Please enter a quick note");
      return;
    }
    appendEvent(`Quick note: ${value}`, "note", {
      persist: true,
    });
    playUiTone("success");
    triggerHaptic("success");
    toast.success("Quick note saved");
    closeSheet();
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div style={styles.liveRow}>
          <div style={styles.redDot} />
          <span style={styles.liveText}>STRESS MODE ACTIVE</span>
        </div>

        <div style={styles.topBarActions}>
          <p style={styles.elapsed}>{getElapsedLabel(sessionStartedAt)}</p>
          <Link to="/dashboard" style={styles.backButton}>
            Back to Dashboard
          </Link>
        </div>
      </div>

      <div style={styles.center}>
        <h1 style={styles.title}>Capture what is happening right now.</h1>

        <p style={styles.subtitle}>
          Proof will timestamp and organize everything automatically.
        </p>

        <button
          style={{
            ...styles.recordButton,
            ...(recording ? styles.recording : {}),
          }}
          onClick={onToggleRecording}
          aria-pressed={recording}
        >
          {recording ? "STOP RECORDING" : "START VOICE CAPTURE"}
        </button>

        {(recording || lastTranscriptPreview) && (
          <p style={styles.transcriptPreview}>
            {lastTranscriptPreview
              ? `Live transcript: “${lastTranscriptPreview}”`
              : "Listening… speak now to capture transcript."}
          </p>
        )}

        <div style={styles.dictationRow}>
          <span style={styles.dictationLabel}>
            {isDictationSupported
              ? (isDictating ? "Live transcript listening…" : "Transcript ready")
              : "Transcript unavailable in this browser"}
          </span>
          <label style={styles.languageWrap}>
            <span style={styles.languageLabel}>Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={styles.languageSelect}
              disabled={recording}
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-BR">Portuguese (BR)</option>
              <option value="hi-IN">Hindi</option>
            </select>
          </label>
        </div>

        <input
          ref={screenshotInputRef}
          type="file"
          accept="image/*"
          multiple
          style={styles.hiddenInput}
          onChange={(e) => {
            onScreenshotSelected(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={styles.hiddenInput}
          onChange={(e) => {
            onPhotoSelected(e.target.files);
            e.currentTarget.value = "";
          }}
        />

        <div style={styles.quickActions}>
          <button style={styles.actionButton} onClick={() => screenshotInputRef.current?.click()}>
            Upload Screenshot
          </button>

          <button style={styles.actionButton} onClick={() => photoInputRef.current?.click()}>
            Take Photo
          </button>

          <button style={styles.actionButton} onClick={onAddWitness}>Add Witness</button>

          <button style={styles.actionButton} onClick={onQuickNote}>Quick Note</button>
        </div>
      </div>

      <div style={styles.timelineCard}>
        <h2 style={styles.timelineTitle}>Live Timeline</h2>

        {events.map((event, idx) => (
          <div
            key={`${event.occurredAt}-${event.text}-${idx}`}
            style={idx === events.length - 1 ? { ...styles.timelineEvent, borderBottom: "none" } : styles.timelineEvent}
          >
            <span style={styles.time}>{formatTime(new Date(event.occurredAt))}</span>
            <span>{event.text}</span>
          </div>
        ))}

        <div style={styles.finalizeRow}>
          <Button
            onClick={finalizeSession}
            disabled={finalizing || events.length === 0}
            className="bg-[#2ECC71] hover:bg-[#2ECC71]/90 text-[#041008] font-semibold"
          >
            {finalizing ? "Finalizing session…" : "Finalize Session"}
          </Button>
          <p style={styles.finalizeHint}>Creates a new incident and opens incident detail automatically.</p>
        </div>
      </div>

      <Drawer
        open={activeSheet !== null}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
      >
        <DrawerContent className="bg-card border-border text-foreground">
          <DrawerHeader>
            <DrawerTitle>{activeSheet === "witness" ? "Add Witness" : "Quick Note"}</DrawerTitle>
            <DrawerDescription>
              {activeSheet === "witness"
                ? "Add witness details now and keep your timeline complete."
                : "Capture a short note while details are fresh."}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4">
            {activeSheet === "witness" ? (
              <Input
                autoFocus
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                placeholder="Witness name and details"
                className="bg-background border-border"
              />
            ) : (
              <Textarea
                autoFocus
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="What happened?"
                rows={4}
                className="bg-background border-border"
              />
            )}
          </div>

          <DrawerFooter className="sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={closeSheet} className="border-border">
              Cancel
            </Button>
            <Button onClick={activeSheet === "witness" ? submitWitness : submitNote}>
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050B16",
    color: "white",
    fontFamily: "Inter, sans-serif",
    padding: "24px",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "40px",
    gap: "12px",
    flexWrap: "wrap",
  },

  liveRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  redDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#E74C3C",
    boxShadow: "0 0 10px #E74C3C",
  },

  liveText: {
    fontWeight: "700",
    letterSpacing: "0.08em",
    color: "#E74C3C",
  },

  elapsed: {
    color: "#8B96A8",
    margin: 0,
  },

  topBarActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  backButton: {
    color: "white",
    textDecoration: "none",
    background: "#131C2E",
    border: "1px solid #243045",
    padding: "10px 14px",
    borderRadius: "12px",
    fontWeight: 600,
    fontSize: "14px",
    lineHeight: 1,
  },

  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginTop: "60px",
  },

  title: {
    fontSize: "clamp(2rem, 6vw, 42px)",
    maxWidth: "700px",
    lineHeight: "1.2",
    marginBottom: "16px",
  },

  subtitle: {
    color: "#AAB4C8",
    maxWidth: "550px",
    lineHeight: "1.6",
    marginBottom: "40px",
    fontSize: "18px",
  },

  transcriptPreview: {
    color: "#C9D3E6",
    maxWidth: "680px",
    marginTop: "-16px",
    marginBottom: "20px",
    fontSize: "13px",
    lineHeight: 1.5,
    fontStyle: "italic",
    opacity: 0.95,
  },

  dictationRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "-20px",
    marginBottom: "30px",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  dictationLabel: {
    color: "#AAB4C8",
    fontSize: "13px",
  },

  languageWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },

  languageLabel: {
    color: "#8B96A8",
    fontSize: "12px",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontWeight: 600,
  },

  languageSelect: {
    background: "#131C2E",
    color: "white",
    border: "1px solid #243045",
    borderRadius: "10px",
    padding: "6px 10px",
    fontSize: "13px",
  },

  recordButton: {
    background: "#4F8CFF",
    border: "none",
    color: "white",
    padding: "24px 42px",
    borderRadius: "18px",
    fontSize: "20px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "0.3s",
    marginBottom: "40px",
  },

  recording: {
    background: "#E74C3C",
    transform: "scale(1.03)",
  },

  quickActions: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    width: "100%",
    maxWidth: "600px",
  },

  actionButton: {
    background: "#131C2E",
    border: "1px solid #243045",
    color: "white",
    padding: "20px",
    borderRadius: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "16px",
  },

  hiddenInput: {
    display: "none",
  },

  timelineCard: {
    marginTop: "60px",
    background: "#101826",
    border: "1px solid #243045",
    borderRadius: "18px",
    padding: "24px",
    maxWidth: "900px",
    marginLeft: "auto",
    marginRight: "auto",
  },

  timelineTitle: {
    marginBottom: "24px",
    fontSize: "22px",
  },

  timelineEvent: {
    display: "flex",
    gap: "24px",
    padding: "14px 0",
    borderBottom: "1px solid #1C2637",
    flexWrap: "wrap",
  },

  finalizeRow: {
    marginTop: "18px",
    borderTop: "1px solid #1C2637",
    paddingTop: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "flex-start",
  },

  finalizeHint: {
    color: "#8B96A8",
    fontSize: "12px",
    margin: 0,
  },

  time: {
    color: "#4F8CFF",
    minWidth: "80px",
    fontWeight: "700",
  },
};
