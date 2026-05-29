import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, MapPin, Users, Tag, AlertTriangle, FileWarning, ListChecks, Paperclip, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative } from "@/lib/mockAI";
import { AIAnalysisSchema, type AIAnalysis } from "@/lib/aiAnalysis";
import { createEvidenceSignedUrl, removeEvidenceFile } from "@/lib/evidenceStorage";
import { playUiTone, triggerHaptic } from "@/lib/feedback";
import { toast } from "sonner";

const ANALYSIS_LOADING_STEPS = [
  "Analyzing timeline…",
  "Detecting contradictions…",
  "Reconstructing incident…",
] as const;

const ScoreBadge = ({ score }: { score: number }) => {
  const color =
    score >= 70 ? "hsl(145 63% 49%)" : score >= 40 ? "hsl(37 90% 61%)" : "hsl(6 78% 57%)";
  const bg =
    score >= 70 ? "hsl(145 63% 9%)" : score >= 40 ? "hsl(37 90% 9%)" : "hsl(6 78% 9%)";
  const border =
    score >= 70 ? "hsl(145 63% 25%)" : score >= 40 ? "hsl(37 90% 30%)" : "hsl(6 78% 30%)";
  return (
    <div
      className="rounded-lg px-5 py-3 text-center border"
      style={{ background: bg, borderColor: border }}
    >
      <div className="text-xs uppercase tracking-widest font-mono mb-1" style={{ color }}>
        Evidence Quality
      </div>
      <div className="text-3xl font-bold" style={{ color }}>
        {score}<span className="text-base text-muted-foreground">/100</span>
      </div>
    </div>
  );
};

const ContradictionCard = ({ text }: { text: string }) => (
  <div className="contradiction-card rounded-lg border border-border px-5 py-4 flex gap-3">
    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
    <p className="text-sm text-foreground">{text}</p>
  </div>
);

type AnalysisBackendUsed = "live-llm" | "fallback" | "unknown";

function readBackendUsed(value: unknown): AnalysisBackendUsed {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "unknown";
  const backend = (value as Record<string, unknown>)._backend_used;
  if (backend === "live-llm" || backend === "fallback") return backend;
  return "unknown";
}

function backendBadgeStyle(backend: AnalysisBackendUsed) {
  if (backend === "live-llm") {
    return {
      label: "Backend used: Live LLM",
      color: "hsl(145 63% 49%)",
      borderColor: "hsl(145 63% 25%)",
      background: "hsl(145 63% 9%)",
    };
  }

  if (backend === "fallback") {
    return {
      label: "Backend used: Fallback",
      color: "hsl(37 90% 61%)",
      borderColor: "hsl(37 90% 35%)",
      background: "hsl(37 90% 10%)",
    };
  }

  return {
    label: "Backend used: Unknown",
    color: "hsl(var(--muted-foreground))",
    borderColor: "hsl(var(--border))",
    background: "hsl(var(--muted) / 0.3)",
  };
}

function getLiveSessionTimelineSnippet(rawNarrative: string) {
  if (!rawNarrative?.trim()) return [] as string[];

  const sections = rawNarrative.split(/\n\n+/).map((part) => part.trim());
  const timelineSection = sections.find((part) => part.toLowerCase().startsWith("timeline events"));
  if (timelineSection) {
    const lines = timelineSection
      .split("\n")
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);
    if (lines.length) return lines;
  }

  const transcriptSection = sections.find((part) => part.toLowerCase().startsWith("transcript"));
  if (!transcriptSection) return [];

  return transcriptSection
    .split("\n")
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => line.replace(/^Voice transcript:\s*/i, ""));
}

const IncidentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [inc, setInc] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [signedEvidenceUrls, setSignedEvidenceUrls] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStepIndex, setAnalysisStepIndex] = useState(0);
  const [showContradictionWow, setShowContradictionWow] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
    setInc(data);
    const { data: ev } = await supabase.from("evidence_items").select("*").eq("incident_id", id);
    const evidenceRows = ev ?? [];
    setEvidence(evidenceRows);

    const signedMap: Record<string, string> = {};
    await Promise.all(
      evidenceRows.map(async (item: any) => {
        if (!item.storage_path) return;
        try {
          signedMap[item.id] = await createEvidenceSignedUrl(item.storage_path);
        } catch {
          // Keep showing metadata even if URL signing fails.
        }
      }),
    );
    setSignedEvidenceUrls(signedMap);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (!analyzing) {
      setAnalysisStepIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setAnalysisStepIndex((prev) => (prev + 1) % ANALYSIS_LOADING_STEPS.length);
    }, 1200);

    return () => {
      window.clearInterval(interval);
    };
  }, [analyzing]);

  const analyze = async () => {
    if (!inc) return;
    setAnalyzing(true);
    setShowContradictionWow(false);
    playUiTone("intelligence");
    triggerHaptic("light");

    const analysisInput = {
      title: inc.title,
      narrative: inc.raw_narrative,
      occurred_at: inc.occurred_at,
      location: inc.location,
      people: Array.isArray(inc.people_involved) ? inc.people_involved : [],
    };

    let ai: AIAnalysis;
    let usedFallback = false;

    try {
      const { data, error } = await supabase.functions.invoke("analyze-incident", {
        body: analysisInput,
      });

      if (error) {
        throw new Error(error.message || "Edge function error");
      }

      const parsed = AIAnalysisSchema.safeParse(data?.analysis);
      if (!parsed.success) {
        throw new Error("Invalid analyze-incident response shape");
      }

      ai = parsed.data;
    } catch {
      ai = analyzeNarrative(analysisInput);
      usedFallback = true;
    }

    const { error } = await supabase.from("incidents").update({
      neutral_summary: ai.neutral_summary,
      emotional_language_removed: ai.emotional_language_removed,
      evidence_quality_score: ai.evidence_quality_score,
      ai_analysis: {
        ...ai,
        _backend_used: usedFallback ? "fallback" : "live-llm",
      } as any,
    }).eq("id", inc.id);
    setAnalyzing(false);
    if (error) { toast.error(error.message); return; }
    if (usedFallback) {
      toast.success("Analysis complete (fallback mode)", {
        description: "Live LLM was unavailable, so local analysis was used.",
      });
    } else {
      toast.success("AI analysis complete");
    }

    if (ai.contradictions.length > 0) {
      setShowContradictionWow(true);
      playUiTone("alert");
      triggerHaptic("alert");
    } else {
      playUiTone("success");
      triggerHaptic("success");
    }

    load();
  };

  const removeEvidence = async (evidenceId: string) => {
    const confirmDelete = window.confirm("Remove this evidence item?");
    if (!confirmDelete) return;

    const target = evidence.find((item) => item.id === evidenceId);
    if (target?.storage_path) {
      try {
        await removeEvidenceFile(target.storage_path);
      } catch (storageError) {
        toast.warning("Could not delete underlying storage object", {
          description: storageError instanceof Error ? storageError.message : "Storage cleanup failed.",
        });
      }
    }

    const { error } = await supabase.from("evidence_items").delete().eq("id", evidenceId);
    if (error) { toast.error(error.message); return; }
    toast.success("Evidence removed");
    load();
  };

  if (!inc) return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-10 text-muted-foreground text-sm">Loading…</div>
    </AppLayout>
  );

  const aiParsed = AIAnalysisSchema.safeParse(inc.ai_analysis);
  const ai: AIAnalysis | null = aiParsed.success ? aiParsed.data : null;
  const backendUsed = readBackendUsed(inc.ai_analysis);
  const backendStyle = backendBadgeStyle(backendUsed);
  const sourceMarker =
    inc.ai_analysis && typeof inc.ai_analysis === "object" && !Array.isArray(inc.ai_analysis)
      ? (inc.ai_analysis as Record<string, unknown>)._source
      : null;
  const isLiveSessionFinalized = sourceMarker === "live-session";
  const liveSessionSnippet = isLiveSessionFinalized ? getLiveSessionTimelineSnippet(inc.raw_narrative ?? "") : [];

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-4xl">
        <Link
          to={`/cases/${inc.case_id}`}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to case
        </Link>

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-muted-foreground mb-2">
              {new Date(inc.occurred_at).toLocaleString(undefined, {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
                hour: "2-digit", minute: "2-digit",
              })}
            </div>
            <h1 className="text-3xl md:text-4xl">{inc.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {inc.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />{inc.location}
                </span>
              )}
              {Array.isArray(inc.people_involved) && inc.people_involved.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />{inc.people_involved.join(", ")}
                </span>
              )}
              {Array.isArray(inc.tags) && inc.tags.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-4 w-4" />{inc.tags.join(", ")}
                </span>
              )}
            </div>
            {ai && (
              <div
                className="mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                style={{
                  color: backendStyle.color,
                  borderColor: backendStyle.borderColor,
                  background: backendStyle.background,
                }}
              >
                {backendStyle.label}
              </div>
            )}
            {isLiveSessionFinalized && (
              <div className="mt-3 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" style={{ color: "#4F8CFF", borderColor: "rgba(79, 140, 255, 0.45)", background: "rgba(79, 140, 255, 0.12)" }}>
                Finalized from Live Session
              </div>
            )}
          </div>
          {typeof inc.evidence_quality_score === "number" && (
            <ScoreBadge score={inc.evidence_quality_score} />
          )}
        </div>

        {isLiveSessionFinalized && liveSessionSnippet.length > 0 && (
          <section className="mb-5 rounded-lg border border-border bg-card p-5 shadow-card">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Live Session Source Timeline</h2>
            <ul className="space-y-2">
              {liveSessionSnippet.map((line, index) => (
                <li key={`${line}-${index}`} className="text-sm text-foreground flex gap-2">
                  <span className="text-accent font-mono text-xs shrink-0 mt-0.5">{String(index + 1).padStart(2, "0")}</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Split view: Raw narrative + AI panel */}
        {showContradictionWow && (
          <section className="mb-5 rounded-xl border px-5 py-4 contradiction-wow" style={{ borderColor: "rgba(231, 76, 60, 0.5)", background: "rgba(231, 76, 60, 0.1)" }}>
            <p className="text-xs uppercase tracking-[0.14em] text-[#E74C3C] font-semibold">AI Alert</p>
            <h2 className="mt-1 text-xl font-semibold">⚠ Contradiction Detected</h2>
            <p className="mt-1 text-sm text-muted-foreground">Statements conflict across your timeline. Review highlighted claims below.</p>
          </section>
        )}

        {ai ? (
          <div className="grid gap-5 lg:grid-cols-2 mb-5">
            {/* LEFT: Raw transcript */}
            <section className="rounded-lg border border-border bg-card p-6 shadow-card">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" /> Raw Transcript
              </h2>
              <p className="text-sm font-mono leading-relaxed text-foreground whitespace-pre-wrap">{inc.raw_narrative}</p>
            </section>

            {/* RIGHT: Structured facts */}
            <div className="space-y-4">
              <section className="rounded-lg border border-border bg-card p-5 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Neutral Summary</h2>
                <p className="text-sm text-foreground" style={{ lineHeight: 1.6 }}>{ai.neutral_summary}</p>
              </section>

              <section className="rounded-lg border border-border bg-card p-5 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <ListChecks className="h-3.5 w-3.5" /> Key Claims &amp; Promises
                </h2>
                <ul className="space-y-1.5">
                  {ai.key_claims.map((c, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-accent font-mono shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>
        ) : (
          /* No AI yet — show raw narrative + analyze button */
          <section className="rounded-lg border border-border bg-card p-6 shadow-card mb-5">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" /> Raw Narrative
            </h2>
            <p className="text-sm font-mono leading-relaxed text-foreground whitespace-pre-wrap mb-5">{inc.raw_narrative}</p>
            <div
              className="mb-4 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                color: backendStyle.color,
                borderColor: backendStyle.borderColor,
                background: backendStyle.background,
              }}
            >
              {backendStyle.label}
            </div>
            <Button onClick={analyze} disabled={analyzing} className="bg-accent hover:bg-accent/90 text-white font-semibold">
              <Sparkles className="mr-2 h-4 w-4" />
              {analyzing ? ANALYSIS_LOADING_STEPS[analysisStepIndex] : "Analyze with AI"}
            </Button>
            {analyzing && (
              <p className="mt-2 text-xs text-muted-foreground animate-pulse">
                {ANALYSIS_LOADING_STEPS[analysisStepIndex]}
              </p>
            )}
          </section>
        )}

        {ai && (
          <>
            {/* Contradictions — visually prominent */}
            {ai.contradictions.length > 0 && (
              <section className="mb-5">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-destructive">Possible Contradictions</span>
                </h2>
                <div className="space-y-3">
                  {ai.contradictions.map((c, i) => (
                    <ContradictionCard key={i} text={c} />
                  ))}
                </div>
              </section>
            )}

            {/* Forensic timeline */}
            <section className="rounded-lg border border-border bg-card p-6 shadow-card mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" /> Evidence Timeline
              </h2>
              <ol className="space-y-3">
                {ai.timeline.map((t, i) => (
                  <li key={i} className="flex gap-4 text-sm">
                    <span className="text-accent font-mono text-xs shrink-0 mt-0.5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="border-l-2 border-accent/30 pl-3 text-foreground">{t}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* 2-col: Missing evidence + Follow-ups */}
            <div className="grid gap-5 md:grid-cols-2 mb-5">
              <section className="rounded-lg border border-border bg-card p-5 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                  <FileWarning className="h-3.5 w-3.5 text-warning" />
                  <span className="text-warning">Missing Evidence</span>
                </h2>
                <ul className="space-y-2">
                  {ai.missing_evidence.map((c, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-warning font-mono text-xs shrink-0 mt-0.5">→</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="rounded-lg border border-border bg-card p-5 shadow-card">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Follow-up Reminders
                </h2>
                <ul className="space-y-2">
                  {ai.follow_ups.map((c, i) => (
                    <li key={i} className="text-sm text-foreground flex gap-2">
                      <span className="text-accent font-mono text-xs shrink-0 mt-0.5">→</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {/* Emotion-stripped */}
            <section className="rounded-lg border border-border bg-card p-6 shadow-card mb-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Emotion-Neutral Version
              </h2>
              <p className="text-sm font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {ai.emotional_language_removed}
              </p>
            </section>
          </>
        )}

        {/* Evidence items */}
        <section className="rounded-lg border border-border bg-card p-6 shadow-card mb-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5" /> Attached Evidence
          </h2>
          {evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence attached yet.</p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded bg-muted/30 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{e.filename ?? "Untitled"}</div>
                    <div className="text-xs text-muted-foreground uppercase font-mono">{e.type}</div>
                    {signedEvidenceUrls[e.id] && (
                      <a
                        href={signedEvidenceUrls[e.id]}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-accent hover:underline"
                      >
                        Open file
                      </a>
                    )}
                    {!signedEvidenceUrls[e.id] && e.storage_path && (
                      <div className="mt-1 text-xs text-muted-foreground">Stored securely (preview unavailable)</div>
                    )}
                    {!e.storage_path && (
                      <div className="mt-1 text-xs text-warning">Storage upload failed for this item</div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => removeEvidence(e.id)}
                    aria-label={`Remove ${e.filename ?? "evidence item"}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Disclaimer />
      </main>
    </AppLayout>
  );
};

export default IncidentDetail;
