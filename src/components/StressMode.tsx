import { useEffect, useRef, useState } from "react";
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
import { AppLayout } from "@/components/AppLayout";
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
    <AppLayout>
      <main className="mx-auto w-full max-w-5xl px-6 py-10 lg:px-10 lg:py-12 space-y-6 md:space-y-7">
        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#E74C3C] shadow-[0_0_10px_rgba(231,76,60,0.7)]" />
              <span className="text-[11px] md:text-xs font-semibold tracking-[0.12em] text-[#E74C3C]">STRESS MODE ACTIVE</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <p>{getElapsedLabel(sessionStartedAt)}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-md border border-border bg-muted/20 px-3 py-1.5 text-foreground hover:bg-muted/30"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card text-center">
          <h1 className="text-3xl md:text-4xl lg:text-[2.6rem] leading-tight font-semibold text-balance">Capture what is happening right now.</h1>
          <p className="mt-3 md:mt-4 text-sm md:text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Proof will timestamp and organize everything automatically.
          </p>

          <button
            className={`mt-6 inline-flex items-center justify-center rounded-xl px-8 py-4 text-base md:text-lg font-bold tracking-wide transition ${recording ? "bg-[#E74C3C] hover:bg-[#E74C3C]/90 text-white scale-[1.02]" : "bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white"}`}
            onClick={onToggleRecording}
            aria-pressed={recording}
          >
            {recording ? "Stop Recording" : "Start Voice Capture"}
          </button>

          {(recording || lastTranscriptPreview) && (
            <p className="mt-4 text-xs md:text-sm italic leading-relaxed text-muted-foreground max-w-2xl mx-auto">
              {lastTranscriptPreview
                ? `Live transcript: “${lastTranscriptPreview}”`
                : "Listening… speak now to capture transcript."}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-xs">
            <span className="text-muted-foreground">
              {isDictationSupported
                ? (isDictating ? "Live transcript listening…" : "Transcript ready")
                : "Transcript unavailable in this browser"}
            </span>
            <label className="inline-flex items-center gap-2">
              <span className="uppercase tracking-[0.08em] text-muted-foreground font-semibold">Language</span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-md border border-border bg-background px-2.5 py-1.5 text-foreground"
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
            className="hidden"
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
            className="hidden"
            onChange={(e) => {
              onPhotoSelected(e.target.files);
              e.currentTarget.value = "";
            }}
          />

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-2xl mx-auto">
            <Button variant="outline" className="border-border" onClick={() => screenshotInputRef.current?.click()}>
              Upload Screenshot
            </Button>
            <Button variant="outline" className="border-border" onClick={() => photoInputRef.current?.click()}>
              Take Photo
            </Button>
            <Button variant="outline" className="border-border" onClick={onAddWitness}>
              Add Witness
            </Button>
            <Button variant="outline" className="border-border" onClick={onQuickNote}>
              Quick Note
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 md:p-6 shadow-card">
          <h2 className="text-xl md:text-2xl leading-tight font-semibold">Live Timeline</h2>

          <div className="mt-4 space-y-0">
            {events.map((event, idx) => (
              <div
                key={`${event.occurredAt}-${event.text}-${idx}`}
                className={`flex flex-wrap gap-4 md:gap-5 py-3 text-sm leading-relaxed ${idx === events.length - 1 ? "" : "border-b border-border"}`}
              >
                <span className="text-accent font-semibold min-w-[84px]">{formatTime(new Date(event.occurredAt))}</span>
                <span className="text-foreground">{event.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-border pt-4 flex flex-col gap-2">
            <Button
              onClick={finalizeSession}
              disabled={finalizing || events.length === 0}
              className="bg-[#2ECC71] hover:bg-[#2ECC71]/90 text-[#041008] font-semibold self-start"
            >
              {finalizing ? "Finalizing session…" : "Finalize Session"}
            </Button>
            <p className="text-xs text-muted-foreground">Creates a new incident and opens incident detail automatically.</p>
          </div>
        </section>

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
      </main>
    </AppLayout>
  );
}
