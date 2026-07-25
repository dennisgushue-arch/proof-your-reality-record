import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { analyzeCase } from "@/lib/caseIntelligence";
import { calculateOverallCompletion } from "@/lib/evidenceCompletion";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { AIHero } from "./components/AIHero";
import { ContinueCases } from "./components/ContinueCases";
import { DashboardEmptyState } from "./components/DashboardEmptyState";
import { DashboardHeader } from "./components/DashboardHeader";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { IntelligenceMetrics } from "./components/IntelligenceMetrics";
import { MissingDocumentation } from "./components/MissingDocumentation";
import { QuickRecordCard } from "./components/QuickRecordCard";
import { RealityReplayPreview } from "./components/RealityReplayPreview";
import { RecommendedAction } from "./components/RecommendedAction";
import {
  countContradictions,
  countEvidenceItems,
  getGreetingName,
  getTimeOfDay,
  isMissingIncidentFields,
  selectRecommendedAction,
} from "./dashboardUtils";
import type { CaseRow, IncidentRow } from "./types";

// Route support verified from src/App.tsx route table.
const ROUTE_SUPPORT = {
  aiBrief: true,
  replay: true,
  createCase: true,
} as const;

const DashboardV2Content = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      await seedDemoIfEmpty(user.id).catch(() => undefined);

      const { data: caseData } = await supabase
        .from("cases")
        .select("id, title, category, updated_at, incidents(count)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      const caseRows = (caseData as CaseRow[] | null) ?? [];
      if (cancelled) return;
      setCases(caseRows);

      const caseIds = caseRows.map((item) => item.id);
      if (caseIds.length > 0) {
        const { data: incidentData } = await supabase
          .from("incidents")
          .select(
            "id, case_id, title, occurred_at, location, people_involved, raw_narrative, neutral_summary, evidence_quality_score, ai_analysis, evidence_items(type, filename, storage_path)",
          )
          .in("case_id", caseIds)
          .order("occurred_at", { ascending: false })
          .limit(120);

        if (!cancelled) {
          setIncidents((incidentData as IncidentRow[] | null) ?? []);
        }
      } else {
        setIncidents([]);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const completion = useMemo(() => calculateOverallCompletion(incidents), [incidents]);
  const intelligence = useMemo(() => analyzeCase(incidents), [incidents]);

  const topCase = cases[0];
  const topCaseIncidents = useMemo(
    () =>
      topCase
        ? incidents
            .filter((incident) => incident.case_id === topCase.id)
            .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
        : [],
    [incidents, topCase],
  );

  const missingIncident = useMemo(() => incidents.find(isMissingIncidentFields), [incidents]);
  const recommendation = useMemo(
    () => selectRecommendedAction({ incidents, missingIncident, topCase }),
    [incidents, missingIncident, topCase],
  );

  const contradictionCount = useMemo(() => countContradictions(incidents), [incidents]);
  const evidenceCount = useMemo(() => countEvidenceItems(incidents), [incidents]);

  const greetingName = getGreetingName(user);
  const greeting = getTimeOfDay();

  const statusTone: "Strong" | "Developing" | "Needs attention" =
    intelligence.evidenceStrength >= 80
      ? "Strong"
      : intelligence.evidenceStrength >= 60
        ? "Developing"
        : "Needs attention";

  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  if (cases.length === 0) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <DashboardHeader greeting={greeting} userDisplayName={greetingName} />
          <DashboardEmptyState recordHref="/record" createCaseHref={ROUTE_SUPPORT.createCase ? "/cases" : undefined} />

          <footer className="mt-10 border-t border-white/[0.05] py-6">
            <p className="max-w-3xl text-[11px] leading-relaxed text-slate-700">
              Proof organizes information supplied by the user. AI output may contain errors and should be reviewed
              against original records. Proof is not a law firm and does not provide legal advice.
            </p>
          </footer>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <DashboardHeader greeting={greeting} userDisplayName={greetingName} />

        <AIHero
          loading={loading}
          status={intelligence.status}
          findings={intelligence.findings}
          completionScore={completion.score}
          incidentCount={incidents.length}
          statusTone={statusTone}
          aiBriefHref={ROUTE_SUPPORT.aiBrief ? "/ai" : undefined}
          replayHref={topCase ? (ROUTE_SUPPORT.replay ? `/cases/${topCase.id}/replay` : `/cases/${topCase.id}`) : undefined}
          replayLabel={ROUTE_SUPPORT.replay ? "Reality Replay" : "Open timeline"}
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <RecommendedAction recommendation={recommendation} />
          <QuickRecordCard href="/record" />
        </div>

        <IntelligenceMetrics
          evidenceStrength={intelligence.evidenceStrength}
          contradictionCount={contradictionCount}
          evidenceCount={evidenceCount}
        />

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <ContinueCases cases={cases} />
          <RealityReplayPreview topCaseId={topCase?.id} events={topCaseIncidents} hasReplayRoute={ROUTE_SUPPORT.replay} />
        </div>

        {completion.next && completion.next.missing.length > 0 && <MissingDocumentation next={completion.next} />}

        <footer className="mt-10 border-t border-white/[0.05] py-6">
          <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-slate-700 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl">
              Proof organizes information supplied by the user. AI output may contain errors and should be reviewed
              against original records. Proof is not a law firm and does not provide legal advice.
            </p>
            <div className="font-bold uppercase tracking-[0.12em]">Private by design</div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
};

export const DashboardV2 = DashboardV2Content;
