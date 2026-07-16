import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import TimelineIntelligencePanel from "@/components/TimelineIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { formatEventType } from "@/utils/realityAnalysis";
import { buildAIReplaySequence, buildContradictionCards, buildTimelineSummary, type PhaseTwoIncident } from "@/lib/phaseTwoAI";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type EvidenceItemRow = {
  id: string;
  filename: string | null;
  type: string;
};

type IncidentRow = {
  id: string;
  title: string;
  occurred_at: string;
  created_at: string;
  location: string | null;
  tags: string[] | null;
  neutral_summary: string | null;
  evidence_quality_score: number | null;
  ai_analysis: unknown;
  evidence_items?: EvidenceItemRow[] | null;
};

type TimelineEvent = {
  id: string;
  title: string;
  type: string;
  occurredAt: string;
  createdAt: string;
  location: string | null;
  sourceType: string;
  evidenceCount: number;
};

function incidentTypeLabel(tags: string[] | null, title: string) {
  const firstTag = Array.isArray(tags) ? tags.find((tag) => Boolean(tag && tag.trim())) : null;
  if (firstTag) return firstTag;
  const compact = title.toLowerCase().trim();
  if (compact.includes("deadline")) return "missed_deadline";
  if (compact.includes("payment")) return "payment";
  if (compact.includes("promise")) return "promise";
  if (compact.includes("explanation")) return "explanation";
  return "incident";
}

function buildSourceType(evidenceItems?: EvidenceItemRow[] | null) {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return "Incident record";
  const firstType = evidenceItems.find((item) => Boolean(item.type?.trim()))?.type;
  return firstType ? formatEventType(firstType) : "Evidence upload";
}

const TimelineIntelligence = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const aiSummaryRef = useRef<HTMLDivElement | null>(null);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [incidentRows, setIncidentRows] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const focusTarget = searchParams.get("focus");
  const focusIncidentId = searchParams.get("incidentId");
  const highlightAiSummary = focusTarget === "ai";
  const highlightReplayIncident = focusTarget === "incident" ? focusIncidentId : null;
  const highlightContradictionIncident = focusTarget === "contradiction" ? focusIncidentId : null;

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);

      const [caseResult, incidentResult] = await Promise.all([
        supabase.from("cases").select("id, title, category, description").eq("id", id).maybeSingle(),
        supabase
          .from("incidents")
          .select("id, title, occurred_at, created_at, location, tags, neutral_summary, evidence_quality_score, ai_analysis, evidence_items(id, filename, type)")
          .eq("case_id", id)
          .order("occurred_at", { ascending: true }),
      ]);

      if (cancelled) return;

      if (caseResult.data) {
        setCaseRow(caseResult.data as CaseRow);
      } else {
        setCaseRow(null);
      }

      const incidentRows = (incidentResult.data as IncidentRow[] | null) ?? [];
      setIncidentRows(incidentRows);
      setEvents(
        incidentRows.map((incident) => ({
          id: incident.id,
          title: incident.title,
          type: incidentTypeLabel(incident.tags ?? null, incident.title),
          occurredAt: incident.occurred_at,
          createdAt: incident.created_at,
          location: incident.location,
          sourceType: buildSourceType(incident.evidence_items),
          evidenceCount: Array.isArray(incident.evidence_items) ? incident.evidence_items.length : 0,
        })),
      );

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (loading) return;

    if (highlightAiSummary) {
      aiSummaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (highlightContradictionIncident) {
      const contradictionEl = document.getElementById(`contradiction-${highlightContradictionIncident}`);
      contradictionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (highlightReplayIncident) {
      const replayEl = document.getElementById(`replay-${highlightReplayIncident}`);
      replayEl?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [highlightAiSummary, highlightContradictionIncident, highlightReplayIncident, loading]);

  const headerDescription = useMemo(() => {
    if (!caseRow) return "Review live case incidents and run timeline analysis against the actual record set.";
    return caseRow.description ?? "Review live case incidents and run timeline analysis against the actual record set.";
  }, [caseRow]);

  const phaseTwoIncidents = useMemo<PhaseTwoIncident[]>(
    () => incidentRows.map((incident) => ({
      id: incident.id,
      title: incident.title,
      occurred_at: incident.occurred_at,
      neutral_summary: incident.neutral_summary,
      ai_analysis: incident.ai_analysis,
    })),
    [incidentRows],
  );

  const timelineSummary = useMemo(
    () => buildTimelineSummary(phaseTwoIncidents),
    [phaseTwoIncidents],
  );

  const contradictionCards = useMemo(
    () => buildContradictionCards(phaseTwoIncidents),
    [phaseTwoIncidents],
  );

  const replaySteps = useMemo(
    () => buildAIReplaySequence(phaseTwoIncidents),
    [phaseTwoIncidents],
  );

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <Link
            to={id ? `/cases/${id}` : "/dashboard"}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to case
          </Link>

          {caseRow && (
            <Button asChild variant="outline" className="border-border">
              <Link to={`/cases/${caseRow.id}/export`}>
                <Sparkles className="mr-2 h-4 w-4" /> Export Packet
              </Link>
            </Button>
          )}
        </div>

        <section className="rounded-xl border border-border bg-card p-6 mb-8 shadow-card">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            Real incident data
          </p>
          <h1 className="text-3xl md:text-4xl mb-2">
            {caseRow ? caseRow.title : "Timeline Intelligence"}
          </h1>
          <p className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
            {headerDescription}
          </p>
          {caseRow && (
            <p className="mt-4 text-xs font-mono text-muted-foreground uppercase tracking-widest">
              {caseRow.category}
            </p>
          )}
        </section>

        <section
          ref={aiSummaryRef}
          className={[
            "rounded-xl border bg-card p-6 mb-8 shadow-card transition-all duration-500",
            highlightAiSummary ? "border-accent ring-2 ring-accent/30 shadow-[0_0_0_1px_rgba(59,130,246,0.35),0_0_32px_rgba(59,130,246,0.14)]" : "border-border",
          ].join(" ")}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">AI timeline summary</p>
          <h2 className="text-2xl font-semibold mb-3 flex items-center gap-2">
            {timelineSummary.headline}
            {highlightAiSummary && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">Focused</span>}
          </h2>
          <div className="space-y-2">
            {timelineSummary.lines.map((line) => (
              <p key={line} className="text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                • {line}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-6 mb-8 shadow-card">
          <p className="text-xs font-mono uppercase tracking-widest text-accent mb-2">AI Replay</p>
          <h2 className="text-2xl font-semibold mb-4">Date-by-date narrative sequence</h2>

          {replaySteps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Add incidents to generate replay steps.</p>
          ) : (
            <div className="space-y-3">
              {replaySteps.map((step) => (
                <div
                  key={step.id}
                  id={`replay-${step.id}`}
                  className={[
                    "rounded-xl border bg-muted/20 p-4 transition-all duration-500",
                    highlightReplayIncident === step.id
                      ? "border-accent ring-2 ring-accent/25 shadow-[0_0_0_1px_rgba(59,130,246,0.28),0_0_24px_rgba(59,130,246,0.12)]"
                      : "border-border",
                  ].join(" ")}
                >
                  <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">▶ {step.dateLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-foreground flex items-center gap-2">
                    {step.title}
                    {highlightReplayIncident === step.id && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
                        Focused
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>
                    {step.narrative}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {contradictionCards.length > 0 && (
          <section className="rounded-xl border border-border bg-card p-6 mb-8 shadow-card">
            <p className="text-xs font-mono uppercase tracking-widest text-destructive mb-2">Contradiction review</p>
            <h2 className="text-2xl font-semibold mb-4">Incident contradiction cards</h2>
            <div className="space-y-3">
              {contradictionCards.map((card) => (
                <div
                  key={card.incidentId}
                  id={`contradiction-${card.incidentId}`}
                  className={[
                    "rounded-xl border p-4 transition-all duration-500",
                    highlightContradictionIncident === card.incidentId
                      ? "ring-2 ring-destructive/35 shadow-[0_0_0_1px_rgba(239,68,68,0.28),0_0_24px_rgba(239,68,68,0.14)]"
                      : "",
                  ].join(" ")}
                  style={{
                    borderColor: card.severity === "critical" ? "hsl(var(--destructive) / 0.45)" : "hsl(var(--warning) / 0.45)",
                    background: card.severity === "critical" ? "hsl(var(--destructive) / 0.08)" : "hsl(var(--warning) / 0.08)",
                  }}
                >
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {card.incidentTitle}
                    {highlightContradictionIncident === card.incidentId && (
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">
                        Focused
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(card.occurredAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {card.contradictions.map((line) => (
                      <li key={line} className="text-sm text-foreground">• {line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {loading ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground text-sm">
            Loading case incidents…
          </div>
        ) : (
          <TimelineIntelligencePanel events={events} defaultTimeZone="America/Los_Angeles" />
        )}
      </main>
    </AppLayout>
  );
};

export default TimelineIntelligence;