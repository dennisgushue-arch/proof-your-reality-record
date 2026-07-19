import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Sparkles,
  Mic,
  AlertTriangle,
  FileText,
  Clock3,
  ShieldCheck,
  FolderKanban,
  MessageSquareText,
  Activity,
  TrendingUp,
  Lock,
  CheckCircle2,
  ListChecks,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { toast } from "sonner";
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
  evidence_items?: { type: string; filename: string | null; storage_path: string | null }[] | null;
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.round(diff / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function readContradictions(ai: unknown): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const c = (ai as { contradictions?: unknown }).contradictions;
  return Array.isArray(c) ? c.filter((x) => typeof x === "string") as string[] : [];
}

function isMissingFields(inc: IncidentRow) {
  const people = Array.isArray(inc.people_involved) ? inc.people_involved : [];
  return (
    !inc.raw_narrative?.trim() ||
    !inc.location?.trim() ||
    people.length === 0
  );
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
      await seedDemoIfEmpty(user.id).catch(() => {});
      const { data: cs } = await supabase
        .from("cases")
        .select("id, title, category, updated_at, incidents(count)")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      const rows = (cs as CaseRow[] | null) ?? [];
      if (cancelled) return;
      setCases(rows);
      const ids = rows.map((r) => r.id);
      if (ids.length) {
        const { data: ins } = await supabase
          .from("incidents")
          .select("id, case_id, title, occurred_at, location, people_involved, raw_narrative, neutral_summary, evidence_quality_score, ai_analysis, evidence_items(type, filename, storage_path)")
          .in("case_id", ids)
          .order("occurred_at", { ascending: false })
          .limit(120);
        if (!cancelled) setIncidents((ins as IncidentRow[] | null) ?? []);
      } else {
        setIncidents([]);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const brief = useMemo(() => {
    const now = Date.now();
    const oneWeek = 7 * 24 * 3600 * 1000;
    const recent = incidents.filter((i) => now - new Date(i.occurred_at).getTime() < oneWeek);
    const contradictionsCount = incidents.filter((i) => readContradictions(i.ai_analysis).length > 0).length;
    const missingCount = incidents.filter(isMissingFields).length;
    const lowScoreCount = incidents.filter((i) => (i.evidence_quality_score ?? 100) < 60).length;

    // Recommended action heuristic
    let action: { label: string; tone: "warning" | "primary" | "success"; href: string } = {
      label: "Review your most recent incident",
      tone: "primary",
      href: incidents[0] ? `/incidents/${incidents[0].id}` : "/cases",
    };
    const missing = incidents.find(isMissingFields);
    if (missing) {
      action = {
        label: "Complete missing incident details",
        tone: "warning",
        href: `/incidents/${missing.id}`,
      };
    } else if (lowScoreCount > 0) {
      const target = incidents.find((i) => (i.evidence_quality_score ?? 100) < 60);
      action = {
        label: "Add supporting evidence to a weak incident",
        tone: "primary",
        href: target ? `/incidents/${target.id}` : "/cases",
      };
    } else if (cases.some((c) => (c.incidents?.[0]?.count ?? 0) >= 3)) {
      const c = cases.find((x) => (x.incidents?.[0]?.count ?? 0) >= 3);
      action = {
        label: "Export a case packet",
        tone: "success",
        href: c ? `/cases/${c.id}/export` : "/cases",
      };
    }

    return {
      activeCases: cases.length,
      recent7d: recent.length,
      contradictionsCount,
      missingCount,
      lowScoreCount,
      action,
    };
  }, [cases, incidents]);

  const completion = useMemo(() => calculateOverallCompletion(incidents), [incidents]);
  const intelligence = useMemo(() => analyzeCase(incidents), [incidents]);

  const activity = useMemo(() => {
    return incidents.slice(0, 6).map((i) => {
      const contradictions = readContradictions(i.ai_analysis).length;
      let tone: "danger" | "success" | "neutral" = "neutral";
      let label = i.title;
      if (contradictions > 0) { tone = "danger"; label = "Possible statement difference detected"; }
      else if ((i.evidence_quality_score ?? 0) >= 75) { tone = "success"; }
      const desc = i.neutral_summary?.trim()
        || (i.raw_narrative?.trim() ? `${i.raw_narrative.slice(0, 110)}${i.raw_narrative.length > 110 ? "…" : ""}` : "Incident added to your timeline.");
      return { id: i.id, label, desc, time: relTime(i.occurred_at), tone };
    });
  }, [incidents]);

  const metrics = useMemo(() => {
    const scored = incidents.filter((i) => typeof i.evidence_quality_score === "number");
    const evidenceStrength = scored.length
      ? Math.round(scored.reduce((s, i) => s + (i.evidence_quality_score ?? 0), 0) / scored.length)
      : incidents.length ? 60 : 0;
    const contradictionRatio = incidents.length ? brief.contradictionsCount / incidents.length : 0;
    const timelineIntegrity = Math.max(0, Math.min(100, Math.round(100 - contradictionRatio * 40 - brief.missingCount * 5)));
    const protection = incidents.length
      ? Math.max(30, Math.min(99, Math.round(evidenceStrength * 0.6 + timelineIntegrity * 0.4)))
      : 0;
    return {
      protection,
      evidenceStrength,
      timelineIntegrity,
      storyChanges: brief.contradictionsCount,
    };
  }, [incidents, brief.contradictionsCount, brief.missingCount]);

  const greetingName = user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || "there";

  const actionToneClasses = {
    warning: "border-amber-500/40 bg-amber-500/5",
    primary: "border-primary/40 bg-primary/5",
    success: "border-emerald-500/40 bg-emerald-500/5",
  } as const;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-primary font-semibold mb-2">
              Reality Intelligence Center
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Good to see you, {greetingName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what Proof AI has identified since your last review.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border border-white/10 rounded-md px-2.5 py-1.5">
              <Lock className="h-3 w-3 text-success" />
              Encrypted · Private
            </div>
            <button
              type="button"
              onClick={() => toast.info("No new alerts.", { description: "You're all caught up." })}
              className="h-9 w-9 rounded-md border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            <Link to="/account" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm" className="border-white/10">Account</Button>
            </Link>
          </div>
        </header>

        {/* PROOF AI BRIEF */}
        <section
          className="relative rounded-xl border border-primary/25 p-6 md:p-7 overflow-hidden"
          style={{
            background: "linear-gradient(180deg, hsl(220 45% 12%) 0%, hsl(220 45% 9%) 100%)",
            boxShadow: "0 0 0 1px hsl(219 100% 65% / 0.05), 0 20px 60px -20px hsl(219 100% 40% / 0.35)",
          }}
        >
          <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-primary bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1">
                  <Sparkles className="h-3 w-3" />
                  Proof AI Brief
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Preview</span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
                {cases.length ? intelligence.status : "Create your first Reality Record"}
              </h2>
              {loading ? (
                <div className="text-sm text-muted-foreground">Reading your case files…</div>
              ) : cases.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Create your first case to activate Proof AI.
                  <Link to="/cases" className="ml-2 text-primary hover:underline">Create a case →</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {intelligence.findings.map((finding) => (
                      <li key={finding} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-lg border border-white/10 bg-black/15 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recommended next action</div>
                    <div className="mt-1 text-sm font-medium text-foreground">{intelligence.recommendedAction}</div>
                  </div>
                  <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BriefStat icon={ShieldCheck} value={intelligence.evidenceStrength} label="Evidence strength" tone={intelligence.evidenceStrength < 50 ? "warning" : "neutral"} />
                    <BriefStat icon={FolderKanban} value={brief.activeCases} label="Active cases" tone="neutral" />
                    <BriefStat icon={AlertTriangle} value={intelligence.contradictionCount} label="Possible differences" tone={intelligence.contradictionCount ? "danger" : "neutral"} />
                    <BriefStat icon={Clock3} value={intelligence.timelineGapCount} label="Timeline gaps" tone={intelligence.timelineGapCount ? "warning" : "neutral"} />
                  </ul>
                </div>
              )}
            </div>
            <div className="lg:w-72 shrink-0 flex flex-col gap-2">
              <Link to="/ai">
                <Button className="w-full bg-primary hover:bg-primary/90 justify-between">
                  Open Full AI Brief <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/ai?ask=1">
                <Button variant="outline" className="w-full justify-between border-primary/30 hover:bg-primary/5">
                  <span className="inline-flex items-center gap-2">
                    <MessageSquareText className="h-4 w-4" /> Ask Proof AI
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* EVIDENCE COMPLETION */}
        {cases.length > 0 && (
          <section className="rounded-xl border border-white/5 bg-card p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Evidence completion</span>
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-3xl font-bold tracking-tight">{completion.score}%</div>
                  <p className="pb-1 text-sm text-muted-foreground">of documented incident fields are complete</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5" role="progressbar" aria-valuenow={completion.score} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completion.score}%` }} />
                </div>
                {completion.next ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Documentation may be incomplete for <span className="font-medium text-foreground">{completion.next.title}</span>. Missing: {completion.next.missing.slice(0, 3).map((item) => item.label).join(", ")}.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">The available records indicate all tracked completion checks are currently satisfied.</p>
                )}
              </div>
              {completion.next && (
                <Link to={`/incidents/${completion.next.incidentId}`} className="w-full md:w-auto">
                  <Button className="w-full md:w-auto">Fix next <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* START LIVE INCIDENT */}
        <section
          className="relative rounded-xl p-6 md:p-7 border overflow-hidden"
          style={{
            borderColor: "hsl(219 100% 65% / 0.35)",
            background: "linear-gradient(135deg, hsl(219 100% 65% / 0.08) 0%, hsl(220 45% 10%) 60%)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="h-14 w-14 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <Mic className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-bold mb-1">
                Live Capture
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Start Live Incident</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                Timestamped capture with notes, voice, photos, and files — filed to a case in seconds.
              </p>
            </div>
            <Link to="/record" className="shrink-0">
              <Button size="lg" className="bg-primary hover:bg-primary/90 font-semibold">
                <Mic className="mr-2 h-4 w-4" /> Start recording
              </Button>
            </Link>
          </div>
        </section>

        {/* RECOMMENDED NEXT ACTION */}
        {cases.length > 0 && (
          <section className={`rounded-lg border p-5 flex flex-wrap items-center gap-4 ${actionToneClasses[brief.action.tone]}`}>
            <div className="h-10 w-10 rounded-md bg-black/20 flex items-center justify-center shrink-0">
              {brief.action.tone === "warning" ? <AlertTriangle className="h-5 w-5 text-amber-400" />
                : brief.action.tone === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                : <Sparkles className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                Recommended next action <span className="ml-1 opacity-70">· Preview</span>
              </div>
              <div className="font-semibold text-foreground">{brief.action.label}</div>
            </div>
            <Link to={brief.action.href}>
              <Button variant="outline" size="sm" className="border-white/15">
                Take action <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </section>
        )}

        {/* ACTIVE CASES + RECENT ACTIVITY */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 rounded-xl border border-white/5 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Case files</div>
                <h2 className="text-lg font-bold">Active cases</h2>
              </div>
              <Link to="/cases" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : cases.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No cases yet. <Link to="/cases" className="text-primary hover:underline">Create one</Link>.
              </div>
            ) : (
              <ul className="divide-y divide-white/5">
                {cases.slice(0, 5).map((c) => {
                  const count = c.incidents?.[0]?.count ?? 0;
                  return (
                    <li key={c.id} className="py-3 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{c.category}</span>
                          <span className="text-[10px] text-muted-foreground">· {relTime(c.updated_at)}</span>
                        </div>
                        <div className="text-sm font-semibold truncate">{c.title}</div>
                        <div className="text-[11px] text-muted-foreground">{count} {count === 1 ? "incident" : "incidents"}</div>
                      </div>
                      <Link to={`/cases/${c.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">Open</Button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-white/5 bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold">Timeline</div>
                <h2 className="text-lg font-bold">Recent activity</h2>
              </div>
            </div>
            {activity.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No recent activity.</div>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                        a.tone === "danger" ? "bg-destructive"
                        : a.tone === "success" ? "bg-emerald-500"
                        : "bg-primary"
                      }`}
                    />
                    <Link to={`/incidents/${a.id}`} className="flex-1 min-w-0 group">
                      <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">{a.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{a.desc}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-0.5">{a.time}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* SECONDARY METRICS */}
        {cases.length > 0 && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricTile icon={ShieldCheck} label="Protection Score" value={`${metrics.protection}%`} />
            <MetricTile icon={FileText} label="Evidence Strength" value={`${metrics.evidenceStrength}%`} />
            <MetricTile icon={Clock3} label="Timeline Integrity" value={`${metrics.timelineIntegrity}%`} />
            <MetricTile icon={TrendingUp} label="Story Changes" value={String(metrics.storyChanges)} />
          </section>
        )}

        <p className="text-[11px] text-muted-foreground/70 leading-relaxed max-w-3xl border-t border-white/5 pt-6">
          Proof organizes information supplied by the user. AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.
        </p>
      </div>
    </AppLayout>
  );
};

function BriefStat({
  icon: Icon, value, label, tone,
}: {
  icon: React.ElementType; value: number; label: string; tone: "neutral" | "warning" | "danger";
}) {
  const color =
    tone === "danger" ? "text-destructive"
    : tone === "warning" ? "text-amber-400"
    : "text-foreground";
  return (
    <li className="rounded-lg bg-black/20 border border-white/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </li>
  );
}

function MetricTile({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-card p-4">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

export default Dashboard;