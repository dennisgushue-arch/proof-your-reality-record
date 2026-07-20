import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Disclaimer } from "@/components/Disclaimer";
import FloatingAIAssistant from "@/components/FloatingAIAssistant";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCase } from "@/lib/caseIntelligence";
import { LIVE_INCIDENT_EVENT, readLiveIncidentState } from "@/lib/liveIncident";
import { CaseActions } from "./components/CaseActions";
import { CaseDetailEmptyState } from "./components/CaseDetailEmptyState";
import { CaseDetailSkeleton } from "./components/CaseDetailSkeleton";
import { CaseHeader } from "./components/CaseHeader";
import { CaseIntelligenceHero } from "./components/CaseIntelligenceHero";
import { CaseTimeline } from "./components/CaseTimeline";
import { EvidenceStrengthPanel } from "./components/EvidenceStrengthPanel";
import { IncidentCard } from "./components/IncidentCard";
import { MissingEvidencePanel } from "./components/MissingEvidencePanel";
import { PatternInsights } from "./components/PatternInsights";
import { RecommendedCaseAction } from "./components/RecommendedCaseAction";
import {
  buildMissingEvidence,
  buildPatternInsights,
  buildReplayEvents,
  countEvidenceItems,
  countPeople,
  filterIncidents,
  getCaseStatus,
  getEvidenceCompletionPercentage,
  getLastActivityLabel,
  selectRecommendedCaseAction,
} from "./caseDetailUtils";
import type { CaseDetailCaseRow, CaseDetailIncidentRow } from "./types";

export const CaseDetailV2 = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRow, setCaseRow] = useState<CaseDetailCaseRow | null>(null);
  const [incidents, setIncidents] = useState<CaseDetailIncidentRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);

      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("id, title, category, description, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (caseError) {
        setLoadError(caseError.message);
        setCaseRow(null);
        setIncidents([]);
        setLoading(false);
        return;
      }

      setCaseRow((caseData as CaseDetailCaseRow | null) ?? null);

      const { data: incidentData, error: incidentError } = await supabase
        .from("incidents")
        .select(
          "id, case_id, title, occurred_at, location, people_involved, tags, neutral_summary, raw_narrative, evidence_quality_score, ai_analysis, created_at, updated_at, evidence_items(id, type, filename, storage_path, description, created_at)",
        )
        .eq("case_id", id)
        .order("occurred_at", { ascending: false });

      if (!cancelled) {
        if (incidentError) {
          setLoadError(incidentError.message);
          setIncidents([]);
          setLoading(false);
          return;
        }

        setIncidents((incidentData as CaseDetailIncidentRow[] | null) ?? []);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const syncLiveSession = () => {
      const state = readLiveIncidentState();
      setActiveLiveSessionId(state?.sessionId ?? null);
    };

    syncLiveSession();
    globalThis.addEventListener("storage", syncLiveSession);
    globalThis.addEventListener(LIVE_INCIDENT_EVENT, syncLiveSession as EventListener);

    return () => {
      globalThis.removeEventListener("storage", syncLiveSession);
      globalThis.removeEventListener(LIVE_INCIDENT_EVENT, syncLiveSession as EventListener);
    };
  }, []);

  const intelligence = useMemo(() => analyzeCase(incidents), [incidents]);
  const filteredIncidents = useMemo(() => filterIncidents(incidents, query), [incidents, query]);
  const missingEvidence = useMemo(() => buildMissingEvidence(incidents), [incidents]);
  const patternInsights = useMemo(() => buildPatternInsights(incidents), [incidents]);
  const replayEvents = useMemo(() => buildReplayEvents(incidents, caseRow?.category), [caseRow?.category, incidents]);
  const summary = useMemo(
    () => ({
      incidentCount: incidents.length,
      evidenceCount: countEvidenceItems(incidents),
      peopleCount: countPeople(incidents),
      completionPercentage: getEvidenceCompletionPercentage(incidents),
      caseStatus: caseRow ? getCaseStatus(caseRow) : "Active",
      lastActivityLabel: getLastActivityLabel(incidents),
    }),
    [caseRow, incidents],
  );
  const recommendedAction = useMemo(
    () => (id ? selectRecommendedCaseAction({ caseId: id, incidents, recommendedIncidentId: intelligence.recommendedIncidentId }) : null),
    [id, incidents, intelligence.recommendedIncidentId],
  );

  const handleAIAssistantAction = (optionId: string) => {
    switch (optionId) {
      case "summarize":
      case "timeline":
      case "contradictions":
      case "missing":
        navigate(`/cases/${id}/intelligence`);
        return;
      case "meeting":
        navigate(`/cases/${id}/prepare`);
        return;
      case "report":
        navigate(`/cases/${id}/export`);
        return;
      default:
        return;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <CaseDetailSkeleton />
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-10">
          <CaseDetailEmptyState variant="failed-query" message={loadError} />
        </main>
      </AppLayout>
    );
  }

  if (!caseRow || !id) {
    return (
      <AppLayout>
        <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6 lg:px-10">
          <CaseDetailEmptyState variant="failed-query" message="This case may have been removed or is unavailable." />
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-[1440px] px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <FloatingAIAssistant caseId={id} onSelectOption={handleAIAssistantAction} />

        <CaseHeader caseRow={caseRow} activeLiveSessionId={activeLiveSessionId} />

        <div className="mt-6">
          <CaseIntelligenceHero caseId={id} caseRow={caseRow} intelligence={intelligence} summary={summary} />
        </div>

        {recommendedAction && (
          <div className="mt-6">
            <RecommendedCaseAction action={recommendedAction} />
          </div>
        )}

        <div className="mt-6">
          <CaseActions caseId={id} activeLiveSessionId={activeLiveSessionId} recommendedIncidentId={intelligence.recommendedIncidentId} />
        </div>

        <div className="mt-6">
          <EvidenceStrengthPanel intelligence={intelligence} incidents={incidents} completionPercentage={summary.completionPercentage} />
        </div>

        <div className="mt-6">
          <CaseTimeline events={replayEvents} />
        </div>

        <section className="mt-8" aria-labelledby="incident-list-title">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Incident cards</p>
              <h2 id="incident-list-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">
                Documentation status by incident
              </h2>
            </div>
            <div className="relative sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, people, location…"
                aria-label="Search incidents"
                className="h-11 rounded-xl border-white/10 bg-[#0B111A] pl-9 text-sm"
              />
            </div>
          </div>

          {incidents.length === 0 ? (
            <CaseDetailEmptyState caseId={id} variant="no-incidents" />
          ) : filteredIncidents.length === 0 ? (
            <CaseDetailEmptyState caseId={id} variant="no-incidents" message="No incidents match that search." />
          ) : (
            <div className="space-y-4">
              {filteredIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} caseCategory={caseRow.category} />
              ))}
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.86fr]">
          <PatternInsights insights={patternInsights} />
          {summary.evidenceCount === 0 && incidents.length > 0 ? (
            <CaseDetailEmptyState caseId={id} variant="no-evidence" />
          ) : (
            <MissingEvidencePanel items={missingEvidence} />
          )}
        </div>

        <section className="mt-8" aria-label="AI and legal disclaimer">
          <Disclaimer />
        </section>
      </main>
    </AppLayout>
  );
};

export default CaseDetailV2;
