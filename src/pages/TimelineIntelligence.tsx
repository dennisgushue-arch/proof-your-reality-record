import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import TimelineIntelligencePanel from "@/components/TimelineIntelligence";
import { supabase } from "@/integrations/supabase/client";
import { formatEventType } from "@/utils/realityAnalysis";

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
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);

      const [caseResult, incidentResult] = await Promise.all([
        supabase.from("cases").select("id, title, category, description").eq("id", id).maybeSingle(),
        supabase
          .from("incidents")
          .select("id, title, occurred_at, created_at, location, tags, neutral_summary, evidence_quality_score, evidence_items(id, filename, type)")
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

  const headerDescription = useMemo(() => {
    if (!caseRow) return "Review live case incidents and run timeline analysis against the actual record set.";
    return caseRow.description ?? "Review live case incidents and run timeline analysis against the actual record set.";
  }, [caseRow]);

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