import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, Filter, MapPin, Paperclip, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type CaseRow = { id: string; title: string; category: string; description: string | null };
type EvidenceItem = { id: string; type: string; filename: string | null };
type ReplayIncident = {
  id: string;
  title: string;
  occurred_at: string;
  location: string | null;
  people_involved: unknown;
  raw_narrative: string;
  neutral_summary: string | null;
  evidence_items: EvidenceItem[] | null;
};

function people(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function confidence(incident: ReplayIncident): "High" | "Medium" | "Limited" {
  let points = 0;
  if (incident.occurred_at) points += 2;
  if (incident.raw_narrative?.trim()) points += 1;
  if (incident.location?.trim()) points += 1;
  if (people(incident.people_involved).length) points += 1;
  if ((incident.evidence_items?.length ?? 0) > 0) points += 2;
  if (points >= 6) return "High";
  if (points >= 3) return "Medium";
  return "Limited";
}

const RealityReplay = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<ReplayIncident[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: rows }] = await Promise.all([
        supabase.from("cases").select("id, title, category, description").eq("id", id).maybeSingle(),
        supabase
          .from("incidents")
          .select("id, title, occurred_at, location, people_involved, raw_narrative, neutral_summary, evidence_items(id, type, filename)")
          .eq("case_id", id)
          .order("occurred_at", { ascending: true }),
      ]);
      if (cancelled) return;
      setCaseRow((c as CaseRow | null) ?? null);
      setIncidents((rows as ReplayIncident[] | null) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return incidents;
    return incidents.filter((incident) => [
      incident.title,
      incident.location,
      incident.neutral_summary,
      incident.raw_narrative,
      ...people(incident.people_involved),
      ...(incident.evidence_items ?? []).map((item) => `${item.type} ${item.filename ?? ""}`),
    ].filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [incidents, query]);

  if (loading || !caseRow) {
    return <AppLayout><div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Building Reality Replay…</div></AppLayout>;
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-10 py-8 pb-24">
        <Link to={`/cases/${id}`} className="mb-6 inline-flex items-center text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to case
        </Link>

        <header className="mb-8 rounded-xl border border-primary/25 bg-card p-6 md:p-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-primary/30 text-primary">Reality Replay</Badge>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Deterministic preview</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{caseRow.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            The available records indicate {incidents.length} documented {incidents.length === 1 ? "incident" : "incidents"} in chronological order. Review the original evidence before relying on any summary.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {caseRow.category}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {incidents.length ? `${new Date(incidents[0].occurred_at).toLocaleDateString()} – ${new Date(incidents[incidents.length - 1].occurred_at).toLocaleDateString()}` : "No date range"}</span>
          </div>
        </header>

        <section className="mb-6 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Filter className="h-4 w-4" /> Filter replay</div>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, location, evidence, or text" className="sm:ml-auto sm:max-w-md" />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 md:p-7">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No records match this filter.</p>
          ) : (
            <ol className="relative ml-2 border-l border-border">
              {filtered.map((incident) => {
                const involved = people(incident.people_involved);
                const level = confidence(incident);
                return (
                  <li key={incident.id} className="relative pb-8 pl-7 last:pb-0">
                    <span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <time className="text-xs font-mono text-muted-foreground">
                        {new Date(incident.occurred_at).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </time>
                      <Badge variant="outline" className="text-[10px]">{level} confidence</Badge>
                    </div>
                    <h2 className="text-base font-semibold">{incident.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {incident.neutral_summary?.trim() || incident.raw_narrative?.trim() || "Documentation may be incomplete."}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                      {incident.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {incident.location}</span>}
                      {involved.length > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {involved.join(", ")}</span>}
                      {(incident.evidence_items?.length ?? 0) > 0 && <span className="inline-flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> {incident.evidence_items?.length} evidence item{incident.evidence_items?.length === 1 ? "" : "s"}</span>}
                    </div>
                    <Link to={`/incidents/${incident.id}`} className="mt-4 inline-flex">
                      <Button variant="outline" size="sm">Review original record</Button>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
    </AppLayout>
  );
};

export default RealityReplay;
