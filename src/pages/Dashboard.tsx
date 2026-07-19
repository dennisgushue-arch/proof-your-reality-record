import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  FileText,
  FolderKanban,
  Lock,
  MapPin,
  Mic,
  Play,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { calculateOverallCompletion } from "@/lib/evidenceCompletion";
import { analyzeCase } from "@/lib/caseIntelligence";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  updated_at: string;
  incidents?: { count: number }[] | null;
};

type IncidentRow = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  location: string | null;
  people_involved: unknown;
  raw_narrative: string;
  neutral_summary: string | null;
  evidence_quality_score: number | null;
  ai_analysis: unknown;
  evidence_items?: {
    type: string;
    filename: string | null;
    storage_path: string | null;
  }[] | null;
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function readContradictions(ai: unknown): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const contradictions = (ai as { contradictions?: unknown }).contradictions;
  return Array.isArray(contradictions)
    ? contradictions.filter((item): item is string => typeof item === "string")
    : [];
}

function isMissingFields(incident: IncidentRow) {
  const people = Array.isArray(incident.people_involved) ? incident.people_involved : [];
  return (
    !incident.raw_narrative?.trim() ||
    !incident.location?.trim() ||
    people.length === 0
  );
}

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

const Dashboard = () => {
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

  const completion = useMemo(
    () => calculateOverallCompletion(incidents),
    [incidents],
  );

  const intelligence = useMemo(
    () => analyzeCase(incidents),
    [incidents],
  );

  const topCase = cases[0];
  const topCaseIncidents = topCase
    ? incidents
        .filter((incident) => incident.case_id === topCase.id)
        .sort(
          (a, b) =>
            new Date(a.occurred_at).getTime() -
            new Date(b.occurred_at).getTime(),
        )
    : [];

  const evidenceCount = incidents.reduce(
    (sum, incident) => sum + (incident.evidence_items?.length ?? 0),
    0,
  );

  const contradictionCount = incidents.reduce(
    (sum, incident) => sum + readContradictions(incident.ai_analysis).length,
    0,
  );

  const missingIncident = incidents.find(isMissingFields);

  const nextAction = useMemo(() => {
    if (missingIncident) {
      return {
        eyebrow: "Highest-impact action",
        title: "Complete missing incident details",
        description:
          "Add the missing people, location, or narrative details to strengthen your documentation.",
        href: `/incidents/${missingIncident.id}`,
        button: "Complete incident",
        improvement: "+8%",
      };
    }

    const weakIncident = incidents.find(
      (incident) => (incident.evidence_quality_score ?? 100) < 60,
    );

    if (weakIncident) {
      return {
        eyebrow: "Evidence opportunity",
        title: "Strengthen a weak incident",
        description:
          "Add supporting evidence or context to improve the reliability of this record.",
        href: `/incidents/${weakIncident.id}`,
        button: "Review incident",
        improvement: "+6%",
      };
    }

    if (topCase) {
      return {
        eyebrow: "Recommended next step",
        title: "Review your active case",
        description:
          "Open your latest case to review findings, missing documentation, and timeline intelligence.",
        href: `/cases/${topCase.id}`,
        button: "Continue case",
        improvement: "+4%",
      };
    }

    return {
      eyebrow: "Start here",
      title: "Create your first Reality Record",
      description:
        "Capture what happened, attach evidence, and let Proof organize the timeline.",
      href: "/record",
      button: "Start recording",
      improvement: "New",
    };
  }, [incidents, missingIncident, topCase]);

  const greetingName =
    user?.user_metadata?.full_name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const statusTone =
    intelligence.evidenceStrength >= 80
      ? "Strong"
      : intelligence.evidenceStrength >= 60
        ? "Developing"
        : "Needs attention";

  return (
    <AppLayout>
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
              Intelligence briefing
            </div>
            <h1 className="text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
              {getTimeOfDay()}, {greetingName}.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
              Proof analyzed your records and prioritized the action most likely
              to strengthen your documentation.
            </p>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.04] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
            <Lock className="h-3.5 w-3.5" />
            Encrypted · Private
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[28px] border border-blue-400/15 bg-[#0d1420] p-5 shadow-[0_30px_100px_-45px_rgba(37,99,235,0.7)] sm:p-7 lg:p-9">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent"
          />

          <div className="relative grid gap-8 xl:grid-cols-[1.5fr_0.8fr] xl:items-center">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 ring-1 ring-blue-400/20">
                  <BrainCircuit className="h-5 w-5 text-blue-300" />
                </span>
                <div>
                  <div className="text-sm font-bold text-white">Proof AI</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
                    Live case analysis
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="py-10 text-sm text-slate-500">
                  Analyzing your records…
                </div>
              ) : cases.length === 0 ? (
                <>
                  <h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                    Your first Reality Record starts here.
                  </h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
                    Record an incident, attach evidence, and let Proof organize
                    the timeline automatically.
                  </p>
                  <Link to="/record" className="mt-7 inline-flex">
                    <Button className="h-12 rounded-xl bg-blue-500 px-6 font-bold hover:bg-blue-400">
                      <Mic className="mr-2 h-4 w-4" />
                      Start recording
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-blue-400/15 bg-blue-400/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
                      {statusTone}
                    </span>
                    <span className="text-xs text-slate-600">
                      Updated from {incidents.length} documented{" "}
                      {incidents.length === 1 ? "incident" : "incidents"}
                    </span>
                  </div>

                  <h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
                    {intelligence.status}
                  </h2>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {intelligence.findings.slice(0, 4).map((finding) => (
                      <div
                        key={finding}
                        className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                        <span className="text-sm leading-relaxed text-slate-300">
                          {finding}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link to="/ai">
                      <Button className="h-11 rounded-xl bg-blue-500 px-5 font-bold hover:bg-blue-400">
                        Open AI brief
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    {topCase && (
                      <Link to={`/cases/${topCase.id}/replay`}>
                        <Button
                          variant="outline"
                          className="h-11 rounded-xl border-white/10 bg-white/[0.02] px-5 font-bold hover:bg-white/[0.06]"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Reality Replay
                        </Button>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="relative mx-auto flex h-[250px] w-[250px] items-center justify-center sm:h-[290px] sm:w-[290px]">
              <div className="absolute inset-0 rounded-full border border-blue-400/10 bg-blue-500/[0.025]" />
              <div className="absolute inset-4 rounded-full border border-dashed border-blue-400/15" />
              <div className="absolute inset-10 rounded-full bg-[#0a101a] shadow-[inset_0_0_45px_rgba(59,130,246,0.08)] ring-1 ring-white/[0.05]" />
              <div className="relative text-center">
                <div className="text-6xl font-black tracking-[-0.07em] text-white">
                  {completion.score}
                  <span className="ml-1 text-2xl text-blue-300">%</span>
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Evidence complete
                </div>
                <div className="mx-auto mt-4 h-1.5 w-28 overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 transition-all duration-700"
                    style={{ width: `${completion.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-[24px] border border-amber-300/12 bg-[#0c121c] p-5 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 ring-1 ring-amber-300/15">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
                  {nextAction.eyebrow}
                </div>
                <h3 className="mt-1 text-xl font-black tracking-[-0.025em] text-white">
                  {nextAction.title}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
                  {nextAction.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden text-right md:block">
                  <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    Potential gain
                  </div>
                  <div className="text-lg font-black text-emerald-300">
                    {nextAction.improvement}
                  </div>
                </div>
                <Link to={nextAction.href}>
                  <Button className="h-11 rounded-xl bg-white px-5 font-bold text-slate-950 hover:bg-slate-200">
                    {nextAction.button}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <Link
            to="/record"
            className="group rounded-[24px] border border-blue-400/15 bg-blue-500 p-5 text-white shadow-[0_24px_60px_-30px_rgba(59,130,246,0.95)] transition hover:bg-blue-400 sm:p-7"
          >
            <div className="flex h-full items-center gap-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <Mic className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                  Live capture
                </div>
                <div className="mt-1 text-xl font-black tracking-[-0.025em]">
                  Record what happened
                </div>
                <div className="mt-1 text-sm text-blue-100/80">
                  Voice, photos, location, and notes.
                </div>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {cases.length > 0 && (
          <>
            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={ShieldCheck}
                label="Evidence strength"
                value={`${intelligence.evidenceStrength}%`}
                detail="Across all active records"
              />
              <MetricCard
                icon={Clock3}
                label="Timeline gaps"
                value={String(intelligence.timelineGapCount)}
                detail={
                  intelligence.timelineGapCount === 0
                    ? "No major gaps detected"
                    : "Review recommended"
                }
                warning={intelligence.timelineGapCount > 0}
              />
              <MetricCard
                icon={AlertTriangle}
                label="Statement differences"
                value={String(contradictionCount)}
                detail={
                  contradictionCount === 0
                    ? "No differences flagged"
                    : "Possible differences for review"
                }
                warning={contradictionCount > 0}
              />
              <MetricCard
                icon={FileText}
                label="Evidence items"
                value={String(evidenceCount)}
                detail="Files attached to incidents"
              />
            </section>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <section className="rounded-[26px] border border-white/[0.06] bg-[#0b111a] p-5 sm:p-7">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                      Continue working
                    </div>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">
                      Active cases
                    </h2>
                  </div>
                  <Link
                    to="/cases"
                    className="flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-blue-200"
                  >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {cases.slice(0, 4).map((caseItem, index) => {
                    const count = caseItem.incidents?.[0]?.count ?? 0;
                    return (
                      <Link
                        key={caseItem.id}
                        to={`/cases/${caseItem.id}`}
                        className="group flex items-center gap-4 rounded-2xl border border-white/[0.055] bg-white/[0.018] p-4 transition hover:border-blue-400/20 hover:bg-blue-400/[0.035]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/8 text-blue-300 ring-1 ring-blue-400/10">
                          <FolderKanban className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
                              {caseItem.category || "Case"}
                            </span>
                            {index === 0 && (
                              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-300">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="mt-1 truncate text-sm font-bold text-slate-100">
                            {caseItem.title}
                          </div>
                          <div className="mt-1 text-xs text-slate-600">
                            {count} {count === 1 ? "incident" : "incidents"} ·{" "}
                            {relTime(caseItem.updated_at)}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-blue-300" />
                      </Link>
                    );
                  })}
                </div>
              </section>

              <section className="relative overflow-hidden rounded-[26px] border border-white/[0.06] bg-[#0b111a] p-5 sm:p-7">
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/[0.055] blur-3xl"
                />
                <div className="relative">
                  <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                        Signature intelligence
                      </div>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">
                        Reality Replay
                      </h2>
                    </div>
                    {topCase && (
                      <Link
                        to={`/cases/${topCase.id}/replay`}
                        className="flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-blue-200"
                      >
                        Open replay
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  {topCaseIncidents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">
                      Add incidents to build a chronological replay.
                    </div>
                  ) : (
                    <div className="relative space-y-0">
                      <div className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-blue-400/50 via-blue-400/20 to-transparent" />
                      {topCaseIncidents.slice(0, 5).map((incident, index) => (
                        <Link
                          key={incident.id}
                          to={`/incidents/${incident.id}`}
                          className="group relative flex gap-4 py-3"
                        >
                          <span className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-[#0b111a]">
                            <CircleDot className="h-3.5 w-3.5 text-blue-300" />
                          </span>
                          <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.045] bg-white/[0.018] p-4 transition group-hover:border-blue-400/15 group-hover:bg-blue-400/[0.025]">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-xs font-black text-blue-300">
                                {new Date(incident.occurred_at).toLocaleTimeString(
                                  [],
                                  { hour: "numeric", minute: "2-digit" },
                                )}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
                                Event {index + 1}
                              </div>
                            </div>
                            <div className="mt-1 truncate text-sm font-bold text-slate-200">
                              {incident.title}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                              {incident.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {incident.location}
                                </span>
                              )}
                              {Array.isArray(incident.people_involved) &&
                                incident.people_involved.length > 0 && (
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {incident.people_involved.length} people
                                  </span>
                                )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {completion.next && (
              <section className="mt-8 rounded-[26px] border border-white/[0.06] bg-[#0b111a] p-5 sm:p-7">
                <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">
                      Missing documentation
                    </div>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">
                      Strengthen “{completion.next.title}”
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      Proof identified incomplete fields that may reduce the
                      usefulness of this incident later.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/[0.05] bg-white/[0.018] p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {completion.next.missing.slice(0, 4).map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center gap-3 rounded-xl bg-black/10 p-3"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                          </span>
                          <span className="text-sm font-medium text-slate-300">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Link
                      to={`/incidents/${completion.next.incidentId}`}
                      className="mt-4 inline-flex"
                    >
                      <Button
                        variant="outline"
                        className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]"
                      >
                        Fix missing details
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <footer className="mt-10 border-t border-white/[0.05] py-6">
          <div className="flex flex-col gap-3 text-[11px] leading-relaxed text-slate-700 sm:flex-row sm:items-start sm:justify-between">
            <p className="max-w-3xl">
              Proof organizes information supplied by the user. AI output may
              contain errors and should be reviewed against original records.
              Proof is not a law firm and does not provide legal advice.
            </p>
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-[0.12em]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Private by design
            </div>
          </div>
        </footer>
      </div>
    </AppLayout>
  );
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  warning = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-white/[0.06] bg-[#0b111a] p-5">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            warning
              ? "bg-amber-400/10 text-amber-300"
              : "bg-blue-500/8 text-blue-300"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        {warning ? (
          <AlertTriangle className="h-4 w-4 text-amber-300" />
        ) : (
          <Check className="h-4 w-4 text-emerald-300" />
        )}
      </div>
      <div className="mt-5 text-3xl font-black tracking-[-0.045em] text-white">
        {value}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-300">{label}</div>
      <div className="mt-1 text-xs text-slate-600">{detail}</div>
    </div>
  );
}

export default Dashboard;