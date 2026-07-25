import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Clock3,
  FileSearch,
  FileText,
  LoaderCircle,
  MapPin,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type CaseRow = { id: string; title: string; category: string | null };
type IncidentRow = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  location: string | null;
  people_involved: unknown;
  raw_narrative: string | null;
  neutral_summary: string | null;
  evidence_quality_score: number | null;
  ai_analysis: unknown;
  evidence_items?: { id: string }[] | null;
};

function readArr(ai: unknown, key: string): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const v = (ai as Record<string, unknown>)[key];
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}

function readPeople(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x : typeof x === "object" && x && "name" in x ? String((x as any).name) : "")).filter(Boolean);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const Section = ({ icon: Icon, title, subtitle, children, tone = "neutral" }: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
}) => {
  const toneRing = tone === "danger" ? "ring-destructive/30" : tone === "warning" ? "ring-amber-500/30" : tone === "success" ? "ring-emerald-500/30" : "ring-white/10";
  const toneIcon = tone === "danger" ? "text-destructive" : tone === "warning" ? "text-amber-400" : tone === "success" ? "text-emerald-400" : "text-primary";
  return (
    <section className={`rounded-2xl border border-white/10 bg-card/60 backdrop-blur p-5 ring-1 ${toneRing}`}>
      <header className="flex items-start gap-3 mb-4">
        <div className={`h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center ${toneIcon}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </header>
      {children}
    </section>
  );
};

const Chip = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "preview" | "danger" | "warning" }) => {
  const cls =
    tone === "preview"
      ? "bg-primary/10 text-primary border-primary/20"
      : tone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
      : "bg-white/5 text-muted-foreground border-white/10";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${cls}`}>{children}</span>;
};

const EmptyLine = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground italic">{text}</p>
);

const AICommandCenter = () => {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [caseId, setCaseId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const askRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: cs } = await supabase
        .from("cases")
        .select("id, title, category")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      const rows = (cs as CaseRow[] | null) ?? [];
      if (cancelled) return;
      setCases(rows);
      const initial = params.get("case") && rows.some((r) => r.id === params.get("case")) ? params.get("case")! : rows[0]?.id ?? "";
      setCaseId(initial);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, params]);

  useEffect(() => {
    if (!caseId) { setIncidents([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("incidents")
        .select("id, case_id, title, occurred_at, location, people_involved, raw_narrative, neutral_summary, evidence_quality_score, ai_analysis, evidence_items(id)")
        .eq("case_id", caseId)
        .order("occurred_at", { ascending: true });
      if (cancelled) return;
      setIncidents((data as IncidentRow[] | null) ?? []);
    })();
    return () => { cancelled = true; };
  }, [caseId]);

  useEffect(() => {
    if (params.get("ask") === "1") {
      askRef.current?.focus();
    }
  }, [params, loading]);

  const activeCase = cases.find((c) => c.id === caseId);

  const brief = useMemo(() => {
    const total = incidents.length;
    const last7 = incidents.filter((i) => Date.now() - new Date(i.occurred_at).getTime() < 7 * 86400000).length;
    const contradictions = incidents.filter((i) => readArr(i.ai_analysis, "contradictions").length > 0).length;
    const missing = incidents.filter((i) => !i.raw_narrative?.trim() || !i.location?.trim() || readPeople(i.people_involved).length === 0).length;
    const noEvidence = incidents.filter((i) => (i.evidence_items?.length ?? 0) === 0).length;
    return { total, last7, contradictions, missing, noEvidence };
  }, [incidents]);

  const contradictionsList = useMemo(
    () => incidents.flatMap((i) => readArr(i.ai_analysis, "contradictions").map((text) => ({ text, incident: i }))),
    [incidents],
  );
  const claimsList = useMemo(
    () => incidents.flatMap((i) => readArr(i.ai_analysis, "key_claims").map((text) => ({ text, incident: i }))),
    [incidents],
  );
  const followUps = useMemo(
    () => incidents.flatMap((i) => readArr(i.ai_analysis, "follow_ups").map((text) => ({ text, incident: i }))),
    [incidents],
  );
  const missingDocs = useMemo(
    () => incidents.filter((i) => (i.evidence_items?.length ?? 0) === 0 || !i.raw_narrative?.trim() || !i.location?.trim() || readPeople(i.people_involved).length === 0),
    [incidents],
  );
  const people = useMemo(() => {
    const s = new Set<string>();
    incidents.forEach((i) => readPeople(i.people_involved).forEach((p) => s.add(p)));
    return [...s];
  }, [incidents]);
  const locations = useMemo(() => {
    const s = new Set<string>();
    incidents.forEach((i) => i.location && s.add(i.location));
    return [...s];
  }, [incidents]);

  const handleCaseChange = (id: string) => {
    setCaseId(id);
    const p = new URLSearchParams(params);
    p.set("case", id);
    setParams(p, { replace: true });
    setAnswer(null);
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || !caseId) return;
    setAsking(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("proof-ai", {
        body: { action: "summarize_case", prompt: q, caseId },
      });
      if (error) throw error;
      const summary = (data && typeof data === "object" && "summary" in data ? String((data as any).summary) : null) ?? "Proof AI reviewed the available records but did not return a summary.";
      setAnswer(summary);
    } catch (e) {
      setAnswer("Proof AI could not complete that request. Free-form questions are limited in this preview — try 'Summarize this case' or review the sections below.");
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading Proof AI…</div>;
  }

  if (!cases.length) {
    return (
      <div className="p-6 lg:p-10 max-w-3xl">
        <p className="text-xs uppercase tracking-widest text-primary/80 mb-2">Proof AI</p>
        <h1 className="font-serif text-3xl mb-3">Command Center</h1>
        <p className="text-muted-foreground mb-6">Create a case to activate Proof AI. All analysis is derived from the records you supply.</p>
        <Button asChild><Link to="/cases">Create your first case</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary/80 mb-1 flex items-center gap-2">
            <Bot size={14} /> Proof AI
          </p>
          <h1 className="font-serif text-3xl lg:text-4xl leading-tight">Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Review chronology, statement differences, and outstanding documentation for the selected case.
          </p>
        </div>
        <label className="flex flex-col gap-1 min-w-[240px]">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Active case</span>
          <select
            value={caseId}
            onChange={(e) => handleCaseChange(e.target.value)}
            className="bg-card border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </label>
      </header>

      {/* AI Case Brief */}
      <Section icon={Sparkles} title="AI Case Brief" subtitle="Counts derived from records supplied by the user.">
        <div className="flex items-center gap-2 mb-3">
          <Chip tone="preview">Preview</Chip>
          <span className="text-[11px] text-muted-foreground">Heuristic — verify against original evidence.</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Incidents", value: brief.total, icon: Clock3, tone: "neutral" as const },
            { label: "In last 7 days", value: brief.last7, icon: Clock3, tone: "neutral" as const },
            { label: "Possible differences", value: brief.contradictions, icon: AlertTriangle, tone: brief.contradictions ? "danger" as const : "neutral" as const },
            { label: "Missing details", value: brief.missing, icon: FileSearch, tone: brief.missing ? "warning" as const : "neutral" as const },
            { label: "No evidence", value: brief.noEvidence, icon: FileText, tone: brief.noEvidence ? "warning" as const : "neutral" as const },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-[11px] uppercase tracking-wide">
                <s.icon size={12} /> {s.label}
              </div>
              <div className={`mt-2 text-2xl font-semibold ${s.tone === "danger" ? "text-destructive" : s.tone === "warning" ? "text-amber-300" : "text-foreground"}`}>{s.value}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Chronology overview */}
      <Section icon={Clock3} title="Chronology overview" subtitle="Documented events in order of occurrence.">
        {incidents.length === 0 ? (
          <EmptyLine text="No incidents recorded for this case yet." />
        ) : (
          <ol className="relative border-l border-white/10 ml-2 space-y-3">
            {incidents.slice(0, 12).map((i) => (
              <li key={i.id} className="pl-4 relative">
                <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/70 ring-2 ring-background" />
                <Link to={`/incidents/${i.id}`} className="block hover:bg-white/5 rounded-md -mx-1 px-1 py-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium truncate">{i.title}</p>
                    <span className="text-[11px] text-muted-foreground shrink-0">{fmtDate(i.occurred_at)}</span>
                  </div>
                  {i.neutral_summary && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{i.neutral_summary}</p>}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Possible differences between statements */}
      <Section icon={AlertTriangle} title="Possible differences between statements" subtitle="Passages where the user's records appear to differ. Review the original evidence." tone={contradictionsList.length ? "danger" : "neutral"}>
        {contradictionsList.length === 0 ? (
          <EmptyLine text="No statement differences detected in the current records." />
        ) : (
          <ul className="space-y-2">
            {contradictionsList.slice(0, 10).map((c, i) => (
              <li key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <p className="text-foreground/90">{c.text}</p>
                <Link to={`/incidents/${c.incident.id}`} className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                  {c.incident.title} <ArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Missing documentation suggestions */}
      <Section icon={FileText} title="Missing documentation suggestions" subtitle="Incidents that appear to have incomplete fields or no supporting evidence." tone={missingDocs.length ? "warning" : "neutral"}>
        {missingDocs.length === 0 ? (
          <EmptyLine text="Documentation appears complete across recorded incidents." />
        ) : (
          <ul className="space-y-2">
            {missingDocs.slice(0, 8).map((i) => {
              const missing: string[] = [];
              if (!i.raw_narrative?.trim()) missing.push("narrative");
              if (!i.location?.trim()) missing.push("location");
              if (readPeople(i.people_involved).length === 0) missing.push("people");
              if ((i.evidence_items?.length ?? 0) === 0) missing.push("evidence");
              return (
                <li key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{i.title}</p>
                    <p className="text-xs text-muted-foreground">Missing: {missing.join(", ")}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary"><Link to={`/incidents/${i.id}`}>Open</Link></Button>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Claims and commitments */}
      <Section icon={MessageSquareText} title="Claims and commitments" subtitle="Statements the records attribute to participants.">
        {claimsList.length === 0 ? (
          <EmptyLine text="No claims or commitments have been extracted from the records." />
        ) : (
          <ul className="space-y-2">
            {claimsList.slice(0, 10).map((c, i) => (
              <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <p>{c.text}</p>
                <Link to={`/incidents/${c.incident.id}`} className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                  {c.incident.title} <ArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* People and locations */}
      <div className="grid lg:grid-cols-2 gap-5">
        <Section icon={Users} title="People" subtitle="Deduplicated from incident records.">
          {people.length === 0 ? <EmptyLine text="No people recorded." /> : (
            <div className="flex flex-wrap gap-2">{people.map((p) => <Chip key={p}>{p}</Chip>)}</div>
          )}
        </Section>
        <Section icon={MapPin} title="Locations" subtitle="Deduplicated from incident records.">
          {locations.length === 0 ? <EmptyLine text="No locations recorded." /> : (
            <div className="flex flex-wrap gap-2">{locations.map((l) => <Chip key={l}>{l}</Chip>)}</div>
          )}
        </Section>
      </div>

      {/* Recommended follow-up questions */}
      <Section icon={ShieldCheck} title="Recommended follow-up questions" subtitle="Prompts to help you capture stronger documentation.">
        {followUps.length === 0 ? (
          <EmptyLine text="No follow-up suggestions available for this case yet." />
        ) : (
          <ul className="space-y-2">
            {followUps.slice(0, 10).map((f, i) => (
              <li key={i} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
                <p>{f.text}</p>
                <Link to={`/incidents/${f.incident.id}`} className="text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1">
                  {f.incident.title} <ArrowRight size={12} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Ask Proof AI */}
      <Section icon={MessageSquareText} title="Ask Proof AI" subtitle="Ask about this case. Answers are generated from the records you supplied.">
        <div className="space-y-3">
          <textarea
            ref={askRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            placeholder='Example: "Summarize this case for a lawyer."'
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              {["Summarize this case", "What documentation is missing?", "List possible statement differences"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setQuestion(p)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
            <Button onClick={ask} disabled={!question.trim() || asking}>
              {asking ? <><LoaderCircle size={14} className="animate-spin mr-1.5" /> Reviewing…</> : <><Send size={14} className="mr-1.5" /> Ask Proof AI</>}
            </Button>
          </div>
          {answer && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm whitespace-pre-wrap">
              <div className="flex items-center gap-2 mb-2 text-primary">
                <Sparkles size={14} /> <span className="text-[11px] uppercase tracking-wide">Proof AI</span>
                <Chip tone="preview">Preview</Chip>
              </div>
              {answer}
            </div>
          )}
        </div>
      </Section>

      <div className="flex items-center gap-2 pt-2">
        <Button variant="secondary" onClick={() => { setAnswer(null); setQuestion(""); }}>
          <RefreshCw size={14} className="mr-1.5" /> Reset
        </Button>
        {activeCase && (
          <Button asChild variant="ghost">
            <Link to={`/cases/${activeCase.id}`}>Open case dossier <ArrowRight size={14} className="ml-1.5" /></Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default AICommandCenter;