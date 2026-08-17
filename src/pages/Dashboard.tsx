import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Sparkles, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { trackProductEvent } from "@/lib/productAnalytics";
import { analyzeCase } from "@/lib/caseIntelligence";
import { calculateOverallCompletion } from "@/lib/evidenceCompletion";
import { ActivationChecklist, type ActivationStep } from "@/features/dashboard-v2/components/ActivationChecklist";
import { readActivationProgress } from "@/lib/activationProgress";
import { AIHero } from "@/features/dashboard-v2/components/AIHero";
import { ContinueCases } from "@/features/dashboard-v2/components/ContinueCases";
import { DashboardEmptyState } from "@/features/dashboard-v2/components/DashboardEmptyState";
import { DashboardHeader } from "@/features/dashboard-v2/components/DashboardHeader";
import { DashboardSkeleton } from "@/features/dashboard-v2/components/DashboardSkeleton";
import { OnboardingCompletionCard } from "@/features/dashboard-v2/components/OnboardingCompletionCard";
import { IntelligenceMetrics } from "@/features/dashboard-v2/components/IntelligenceMetrics";
import { MissingDocumentation } from "@/features/dashboard-v2/components/MissingDocumentation";
import { QuickRecordCard } from "@/features/dashboard-v2/components/QuickRecordCard";
import { RealityReplayPreview } from "@/features/dashboard-v2/components/RealityReplayPreview";
import { RecommendedAction } from "@/features/dashboard-v2/components/RecommendedAction";
import {
  countContradictions,
  countEvidenceItems,
  getGreetingName,
  getTimeOfDay,
  isMissingIncidentFields,
  selectRecommendedAction,
} from "@/features/dashboard-v2/dashboardUtils";
import type { CaseRow, IncidentRow } from "@/features/dashboard-v2/types";
import {
  completeFirstRecordOnboarding,
  readFirstRecordOnboarding,
  restartFirstRecordOnboarding,
  type FirstRecordOnboardingState,
} from "@/lib/firstRecordOnboarding";

// Route support verified from src/App.tsx route table.
const ROUTE_SUPPORT = {
  aiBrief: true,
  replay: true,
  createCase: true,
} as const;

const Dashboard = () => {
  const { user, hasPaidAccess } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onboardingState, setOnboardingState] = useState<FirstRecordOnboardingState>(() =>
    readFirstRecordOnboarding(user?.id ?? ""),
  );
  const [skippedForNow, setSkippedForNow] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    setOnboardingState(readFirstRecordOnboarding(user?.id ?? ""));
    setSkippedForNow(false);
    setShowCompletion(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
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
  const totalIncidentCount = useMemo(
    () => cases.reduce((sum, caseItem) => sum + (caseItem.incidents?.[0]?.count ?? 0), 0),
    [cases],
  );
  const firstIncident = incidents[0];
  const firstCase = cases[0];
  const hasAIAnalysis = incidents.some((incident) => Boolean(incident.neutral_summary || incident.evidence_quality_score));
  const activationProgress = readActivationProgress(undefined, user?.id);
  const activationSteps: ActivationStep[] = [
    { id: "case", label: "Create your first case", description: "Give related incidents and evidence one organized home.", complete: cases.length > 0, href: "/cases", actionLabel: "Create case" },
    { id: "incident", label: "Add your first incident", description: "Capture one dated event to start the timeline.", complete: incidents.length > 0, href: firstCase ? `/record?caseId=${firstCase.id}` : "/record", actionLabel: "Add incident" },
    { id: "evidence", label: "Upload evidence", description: "Attach a photo, audio file, document, or other supporting record.", complete: evidenceCount > 0, href: firstIncident ? `/incidents/${firstIncident.id}` : "/record", actionLabel: "Add evidence" },
    { id: "ai", label: "Run AI Analysis", description: "Generate a neutral summary and documentation review.", complete: hasAIAnalysis, href: firstIncident ? `/incidents/${firstIncident.id}` : "/record", actionLabel: "Run AI Analysis" },
    { id: "entities", label: "Run Entity Analysis", description: "Identify recurring people, places, organizations, and connections.", complete: activationProgress["entity-analysis"] === true, href: firstIncident ? `/incidents/${firstIncident.id}` : "/record", actionLabel: "Run Entity Analysis" },
  ];
  const allActivationStepsComplete = activationSteps.every((step) => step.complete);

  useEffect(() => {
    if (loading || !user || onboardingState.completed || !allActivationStepsComplete) return;
    setOnboardingState(completeFirstRecordOnboarding(user.id));
    setShowCompletion(true);
  }, [allActivationStepsComplete, loading, onboardingState.completed, user]);

  useEffect(() => {
    if (!user || hasPaidAccess || totalIncidentCount < 3) return;

    const storageKey = `proof.premium-prompt-seen.${user.id}`;
    if (window.localStorage.getItem(storageKey)) return;

    let cancelled = false;

    void (async () => {
      const tracked = await trackProductEvent("premium_prompt_seen", {
        incident_count: totalIncidentCount,
        evidence_count: evidenceCount,
        source: "dashboard_v2",
      });

      if (!cancelled && tracked) {
        window.localStorage.setItem(storageKey, "1");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, hasPaidAccess, totalIncidentCount, evidenceCount]);

  const restartOnboarding = () => {
    if (!user) return;
    setOnboardingState(restartFirstRecordOnboarding(user.id));
    setSkippedForNow(false);
    setShowCompletion(allActivationStepsComplete);
  };

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
          {!onboardingState.completed && !skippedForNow ? (
            <DashboardEmptyState createCaseHref="/cases" steps={activationSteps} onSkip={() => setSkippedForNow(true)} />
          ) : (
            <section className="rounded-[28px] border border-white/[0.07] bg-[#0D1420] p-6 sm:p-8">
              <h2 className="text-2xl font-black text-white">Your workspace is ready.</h2>
              <p className="mt-2 text-sm text-slate-400">Create a case when you&apos;re ready to organize your first record.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button asChild className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400"><Link to="/cases">Create case</Link></Button>
                <Button type="button" variant="ghost" onClick={restartOnboarding} className="rounded-xl text-slate-400 hover:text-white"><RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />Restart getting started</Button>
              </div>
            </section>
          )}

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

        {showCompletion && firstCase ? (
          <OnboardingCompletionCard
            timelineHref={`/cases/${firstCase.id}/intelligence`}
            exportHref={`/cases/${firstCase.id}/export`}
            onDismiss={() => setShowCompletion(false)}
          />
        ) : !onboardingState.completed ? (
          <ActivationChecklist steps={activationSteps} />
        ) : null}

        <div className="mt-6">
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
        </div>

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

        {!hasPaidAccess && totalIncidentCount >= 3 && (
          <section className="mt-8 overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-blue-500/10 via-[#0D1420] to-violet-500/10 p-6 sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Premium
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Proof found more in your record
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  You&apos;ve documented {totalIncidentCount} incidents. Premium unlocks deeper record intelligence,
                  expanded case capacity, and more ways to understand what your documentation shows over time.
                </p>
              </div>
              <Button asChild className="h-12 shrink-0 rounded-xl bg-blue-500 px-6 font-black text-white hover:bg-blue-400">
                <Link to="/pricing">
                  Unlock My Full Record
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        <footer className="mt-10 border-t border-white/[0.05] py-6">
          <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-slate-700 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl">
              Proof organizes information supplied by the user. AI output may contain errors and should be reviewed
              against original records. Proof is not a law firm and does not provide legal advice.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {onboardingState.completed && (
                <button type="button" onClick={restartOnboarding} className="rounded-lg px-2 py-1 font-bold text-slate-600 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                  Restart getting started
                </button>
              )}
              <div className="font-bold uppercase tracking-[0.12em]">Private by design</div>
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
