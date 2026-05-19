import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Sparkles, MapPin, Users, Tag, AlertTriangle, FileWarning, ListChecks, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { analyzeNarrative, AIAnalysis } from "@/lib/mockAI";
import { toast } from "sonner";

const IncidentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [inc, setInc] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data } = await supabase.from("incidents").select("*").eq("id", id).maybeSingle();
    setInc(data);
    const { data: ev } = await supabase.from("evidence_items").select("*").eq("incident_id", id);
    setEvidence(ev ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const analyze = async () => {
    if (!inc) return;
    setAnalyzing(true);
    const ai = analyzeNarrative({
      title: inc.title, narrative: inc.raw_narrative,
      occurred_at: inc.occurred_at, location: inc.location,
      people: Array.isArray(inc.people_involved) ? inc.people_involved : [],
    });
    const { error } = await supabase.from("incidents").update({
      neutral_summary: ai.neutral_summary,
      emotional_language_removed: ai.emotional_language_removed,
      evidence_quality_score: ai.evidence_quality_score,
      ai_analysis: ai as any,
    }).eq("id", inc.id);
    setAnalyzing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("AI analysis complete");
    load();
  };

  if (!inc) return (<div className="min-h-screen bg-subtle"><AppHeader /><div className="container py-10 text-muted-foreground">Loading…</div></div>);

  const ai: AIAnalysis | null = inc.ai_analysis;

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10 max-w-4xl">
        <Link to={`/cases/${inc.case_id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to case</Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-muted-foreground">{new Date(inc.occurred_at).toLocaleString()}</div>
            <h1 className="mt-1 text-3xl md:text-4xl font-semibold">{inc.title}</h1>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              {inc.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{inc.location}</span>}
              {Array.isArray(inc.people_involved) && inc.people_involved.length > 0 && (
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{inc.people_involved.join(", ")}</span>
              )}
              {Array.isArray(inc.tags) && inc.tags.length > 0 && (
                <span className="inline-flex items-center gap-1"><Tag className="h-4 w-4" />{inc.tags.join(", ")}</span>
              )}
            </div>
          </div>
          {typeof inc.evidence_quality_score === "number" && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-center shadow-card">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Evidence quality</div>
              <div className="text-3xl font-semibold text-accent">{inc.evidence_quality_score}<span className="text-base text-muted-foreground">/100</span></div>
            </div>
          )}
        </div>

        <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold">Original narrative</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{inc.raw_narrative}</p>
          {!ai && (
            <Button className="mt-5" onClick={analyze} disabled={analyzing}>
              <Sparkles className="mr-2 h-4 w-4" /> {analyzing ? "Analyzing…" : "Analyze with AI"}
            </Button>
          )}
        </section>

        {ai && (
          <>
            <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold">Neutral factual summary</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{ai.neutral_summary}</p>
            </section>

            <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><ListChecks className="h-5 w-5 text-accent" /> Timeline</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {ai.timeline.map((t, i) => <li key={i} className="border-l-2 border-accent/40 pl-3">{t}</li>)}
              </ul>
            </section>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold">Key claims & promises</h2>
                <ul className="mt-3 space-y-2 text-sm list-disc pl-5">
                  {ai.key_claims.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
              <section className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5 text-warning" /> Possible contradictions</h2>
                {ai.contradictions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No contradictions detected.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm list-disc pl-5">
                    {ai.contradictions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                )}
              </section>
              <section className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><FileWarning className="h-5 w-5 text-warning" /> Missing evidence</h2>
                <ul className="mt-3 space-y-2 text-sm list-disc pl-5">
                  {ai.missing_evidence.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
              <section className="rounded-xl border border-border bg-card p-6 shadow-card">
                <h2 className="text-lg font-semibold">Follow-up reminders</h2>
                <ul className="mt-3 space-y-2 text-sm list-disc pl-5">
                  {ai.follow_ups.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </section>
            </div>

            <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold">Emotional language removed</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{ai.emotional_language_removed}</p>
            </section>
          </>
        )}

        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Paperclip className="h-5 w-5" /> Evidence</h2>
          {evidence.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No evidence attached yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {evidence.map((e) => (
                <li key={e.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                  <span>{e.filename ?? "Untitled"}</span>
                  <span className="text-xs text-muted-foreground uppercase">{e.type}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-8"><Disclaimer /></div>
      </main>
    </div>
  );
};

export default IncidentDetail;
