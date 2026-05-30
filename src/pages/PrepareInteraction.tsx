import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarClock, CheckCircle2, CircleAlert, Clock3, FileWarning, ListChecks, Lock, MessageSquareQuote, Siren, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { buildInteractionChecklist, buildPrepareBriefing, type PrepareIncident, type PrepareInteractionType } from "@/lib/prepareInteraction";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type ReminderRow = {
  id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
  case_id: string;
};

type SubscriptionRow = {
  plan: string;
  status: string;
};

const INTERACTION_OPTIONS: Array<{ value: PrepareInteractionType; label: string }> = [
  { value: "phone-call", label: "Phone Call" },
  { value: "in-person-meeting", label: "In-Person Meeting" },
  { value: "custody-exchange", label: "Custody Exchange" },
  { value: "contractor-visit", label: "Contractor Visit" },
  { value: "insurance-discussion", label: "Insurance Discussion" },
  { value: "workplace-meeting", label: "Workplace Meeting" },
  { value: "other", label: "Other" },
];

const STEP_TITLES = [
  "Interaction Setup",
  "AI Briefing",
  "What Matters Most",
  "Potential Story Changes",
  "Missing Evidence",
  "Recommended Questions",
  "Interaction Checklist",
  "Quick Capture Launch",
] as const;

function defaultInteractionDateTime() {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}

function toLocalInputValue(dateStr?: string | null) {
  if (!dateStr) return defaultInteractionDateTime();
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return defaultInteractionDateTime();
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function formatDueLabel(value?: string | null) {
  if (!value) return "No time scheduled yet";
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function reminderTitleForType(type: PrepareInteractionType, customOther: string) {
  if (type === "other") return customOther.trim() || "Other interaction";
  return INTERACTION_OPTIONS.find((option) => option.value === type)?.label ?? "Interaction";
}

function parseReminderType(title?: string | null): PrepareInteractionType {
  const normalized = (title ?? "").toLowerCase();
  if (normalized.includes("phone")) return "phone-call";
  if (normalized.includes("custody")) return "custody-exchange";
  if (normalized.includes("contractor")) return "contractor-visit";
  if (normalized.includes("insurance")) return "insurance-discussion";
  if (normalized.includes("workplace") || normalized.includes("hr")) return "workplace-meeting";
  if (normalized.includes("meeting") || normalized.includes("mediation")) return "in-person-meeting";
  return "other";
}

const PrepareInteraction = () => {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingSetup, setSavingSetup] = useState(false);
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<PrepareIncident[]>([]);
  const [upcomingReminder, setUpcomingReminder] = useState<ReminderRow | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [step, setStep] = useState(0);
  const [interactionType, setInteractionType] = useState<PrepareInteractionType>("phone-call");
  const [customOther, setCustomOther] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultInteractionDateTime());
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id || !user) return;

    let cancelled = false;
    (async () => {
      setLoading(true);

      const [caseResult, incidentsResult, reminderResult, subscriptionResult] = await Promise.all([
        supabase.from("cases").select("id, title, category, description").eq("id", id).maybeSingle(),
        supabase
          .from("incidents")
          .select("id, title, occurred_at, raw_narrative, neutral_summary, ai_analysis")
          .eq("case_id", id)
          .order("occurred_at", { ascending: false }),
        supabase
          .from("reminders")
          .select("id, title, due_at, completed, case_id")
          .eq("case_id", id)
          .eq("user_id", user.id)
          .eq("completed", false)
          .not("due_at", "is", null)
          .gte("due_at", new Date().toISOString())
          .order("due_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      if (caseResult.error) {
        toast.error(caseResult.error.message);
      }

      if (incidentsResult.error) {
        toast.error(incidentsResult.error.message);
      }

      setCaseRow(caseResult.data as CaseRow | null);
      setIncidents(((incidentsResult.data as PrepareIncident[] | null) ?? []));
      setUpcomingReminder((reminderResult.data as ReminderRow | null) ?? null);
      setSubscription((subscriptionResult.data as SubscriptionRow | null) ?? null);

      if (reminderResult.data) {
        const reminder = reminderResult.data as ReminderRow;
        const parsedType = parseReminderType(reminder.title);
        setInteractionType(parsedType);
        setCustomOther(parsedType === "other" ? reminder.title : "");
        setScheduledAt(toLocalInputValue(reminder.due_at));
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const hasPrepareAccess = subscription?.plan === "pro" || subscription?.plan === "premium";
  const briefing = useMemo(
    () => buildPrepareBriefing({ incidents, interactionType, scheduledAt }),
    [incidents, interactionType, scheduledAt],
  );

  useEffect(() => {
    setChecklistState(
      Object.fromEntries(buildInteractionChecklist(interactionType).map((item) => [item.id, false])),
    );
  }, [interactionType]);

  const interactionLabel = reminderTitleForType(interactionType, customOther);
  const progressLabel = `${step + 1} / ${STEP_TITLES.length}`;

  const saveSetupAndContinue = async () => {
    if (!id || !user) return;
    if (!scheduledAt) {
      toast.error("Choose when the interaction is happening.");
      return;
    }
    if (interactionType === "other" && !customOther.trim()) {
      toast.error("Add a label for the interaction.");
      return;
    }

    setSavingSetup(true);

    const payload = {
      case_id: id,
      user_id: user.id,
      title: interactionLabel,
      due_at: new Date(scheduledAt).toISOString(),
      completed: false,
    };

    const query = upcomingReminder?.id
      ? supabase.from("reminders").update(payload).eq("id", upcomingReminder.id).select("id, title, due_at, completed, case_id").single()
      : supabase.from("reminders").insert(payload).select("id, title, due_at, completed, case_id").single();

    const { data, error } = await query;
    setSavingSetup(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setUpcomingReminder(data as ReminderRow);
    setStep(1);
    toast.success("Interaction saved", {
      description: "Your preparation briefing is ready.",
    });
  };

  const goNext = () => {
    if (step === 0) {
      void saveSetupAndContinue();
      return;
    }
    setStep((prev) => Math.min(prev + 1, STEP_TITLES.length - 1));
  };

  const goBack = () => setStep((prev) => Math.max(prev - 1, 0));

  if (loading) {
    return (
      <AppLayout>
        <div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Preparing interaction workspace…</div>
      </AppLayout>
    );
  }

  if (!caseRow) {
    return (
      <AppLayout>
        <div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Case not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-5xl">
        <Link
          to={`/cases/${caseRow.id}`}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to case
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">Prepare Me™</p>
              <h1 className="mt-2 text-3xl md:text-4xl font-semibold">Prepare for interaction</h1>
              <p className="mt-3 text-sm text-muted-foreground max-w-2xl">
                Walk into the next conversation with the timeline, risks, contradictions, and questions already organized.
              </p>
            </div>
            <div className="rounded-xl border border-border px-4 py-3 min-w-[220px] bg-muted/20">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Upcoming interaction</p>
              <p className="mt-2 text-sm font-semibold text-foreground">{interactionLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatDueLabel(upcomingReminder?.due_at ?? scheduledAt)}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            <span>Screen {progressLabel}: {STEP_TITLES[step]}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STEP_TITLES.map((title, index) => (
              <span
                key={title}
                className="inline-flex rounded-full border px-2.5 py-1 text-[11px]"
                style={{
                  borderColor: index === step ? "rgba(79, 140, 255, 0.55)" : "hsl(var(--border))",
                  color: index === step ? "#4F8CFF" : "hsl(var(--muted-foreground))",
                  background: index === step ? "rgba(79, 140, 255, 0.08)" : "transparent",
                }}
              >
                {index + 1}. {title}
              </span>
            ))}
          </div>
        </div>

        {!hasPrepareAccess ? (
          <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-accent mt-0.5" />
              <div>
                <h2 className="text-xl font-semibold">Prepare Me is a Pro feature</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  People don’t pay for storage — they pay to walk into a difficult conversation already prepared. Upgrade to unlock AI briefings, contradictions, evidence gaps, and guided questions.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/pricing">
                    <Button className="bg-accent hover:bg-accent/90 text-white">See Pro plans</Button>
                  </Link>
                  <Link to={`/cases/${caseRow.id}`}>
                    <Button variant="outline" className="border-border">Back to case</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
              {step === 0 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><CalendarClock className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Interaction Setup</span></div>
                  <h2 className="text-2xl font-semibold">What are you preparing for?</h2>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {INTERACTION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="rounded-xl border p-4 text-left transition-colors"
                        style={{
                          borderColor: interactionType === option.value ? "rgba(79, 140, 255, 0.5)" : "hsl(var(--border))",
                          background: interactionType === option.value ? "rgba(79, 140, 255, 0.08)" : "transparent",
                        }}
                        onClick={() => setInteractionType(option.value)}
                      >
                        <p className="font-semibold text-foreground">{option.label}</p>
                      </button>
                    ))}
                  </div>
                  {interactionType === "other" && (
                    <div className="mt-4 max-w-lg">
                      <Label htmlFor="other-label">Describe the interaction</Label>
                      <Input id="other-label" className="mt-1.5 bg-background border-border" value={customOther} onChange={(e) => setCustomOther(e.target.value)} placeholder="e.g. Mediation session" />
                    </div>
                  )}
                  <div className="mt-5 max-w-lg">
                    <Label htmlFor="scheduled-at">When is it happening?</Label>
                    <Input id="scheduled-at" type="datetime-local" className="mt-1.5 bg-background border-border" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">AI Briefing</span></div>
                  <h2 className="text-2xl font-semibold">Situation Summary</h2>
                  <div className="mt-5 space-y-3">
                    {briefing.situationSummary.map((line) => (
                      <div key={line} className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-foreground">{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><ListChecks className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">What Matters Most</span></div>
                  <h2 className="text-2xl font-semibold">Priority Topics</h2>
                  <ol className="mt-5 space-y-3">
                    {briefing.priorityTopics.map((topic, index) => (
                      <li key={topic} className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-foreground flex gap-3">
                        <span className="text-accent font-mono shrink-0">{index + 1}.</span>
                        <span>{topic}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="flex items-center gap-2 text-destructive mb-3"><MessageSquareQuote className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Potential Story Changes</span></div>
                  <h2 className="text-2xl font-semibold">Story Changed Risks</h2>
                  <div className="mt-5 space-y-3">
                    {briefing.storyChangedRisks.length ? briefing.storyChangedRisks.map((risk) => (
                      <div key={risk} className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground">
                        <p>{risk}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Ask for clarification while the interaction is still live.</p>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">No major story changes were flagged from the current record.</div>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <div className="flex items-center gap-2 text-warning mb-3"><FileWarning className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Missing Evidence</span></div>
                  <h2 className="text-2xl font-semibold">Evidence Gaps</h2>
                  <div className="mt-5 space-y-3">
                    {briefing.missingEvidence.length ? briefing.missingEvidence.map((gap) => (
                      <div key={gap} className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-foreground flex gap-3">
                        <CircleAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">No obvious missing evidence is currently blocking this interaction.</div>
                    )}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><MessageSquareQuote className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Recommended Questions</span></div>
                  <h2 className="text-2xl font-semibold">Questions To Ask</h2>
                  <ul className="mt-5 space-y-3">
                    {briefing.recommendedQuestions.map((question) => (
                      <li key={question} className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-foreground">• {question}</li>
                    ))}
                  </ul>
                </div>
              )}

              {step === 6 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><CheckCircle2 className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Interaction Checklist</span></div>
                  <h2 className="text-2xl font-semibold">Before the interaction</h2>
                  <div className="mt-5 space-y-3">
                    {briefing.checklist.map((item) => (
                      <label key={item.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={Boolean(checklistState[item.id])}
                          onChange={() => setChecklistState((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {step === 7 && (
                <div>
                  <div className="flex items-center gap-2 text-accent mb-3"><Siren className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Quick Capture Launch</span></div>
                  <h2 className="text-2xl font-semibold">When the interaction starts</h2>
                  <div className="mt-5 rounded-2xl border border-border bg-muted/20 p-5">
                    <p className="text-sm text-muted-foreground">Seamless flow:</p>
                    <p className="mt-2 text-sm text-foreground">Prepare → Review risks → Review contradictions → Review questions → Start Live Incident → Capture Reality</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link to={`/stress-mode?caseId=${encodeURIComponent(caseRow.id)}`}>
                        <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-semibold">
                          <Siren className="mr-2 h-4 w-4" /> START LIVE INCIDENT
                        </Button>
                      </Link>
                      <Link to={`/cases/${caseRow.id}`}>
                        <Button variant="outline" className="border-border">Back to case</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button variant="outline" className="border-border" onClick={goBack} disabled={step === 0 || savingSetup}>
                Back
              </Button>
              {step < STEP_TITLES.length - 1 ? (
                <Button className="bg-accent hover:bg-accent/90 text-white" onClick={goNext} disabled={savingSetup}>
                  {step === 0 ? (savingSetup ? "Saving…" : "Build briefing") : "Next"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Link to={`/stress-mode?caseId=${encodeURIComponent(caseRow.id)}`}>
                  <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white">
                    <Clock3 className="mr-2 h-4 w-4" /> Launch Stress Mode
                  </Button>
                </Link>
              )}
            </div>
          </>
        )}
      </main>
    </AppLayout>
  );
};

export default PrepareInteraction;
