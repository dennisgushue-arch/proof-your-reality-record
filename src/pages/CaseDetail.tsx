import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Search, FileDown, MapPin, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { categoryColor } from "@/lib/categories";

type Inc = {
  id: string; title: string; occurred_at: string; location: string | null;
  people_involved: any; tags: any; neutral_summary: string | null;
  evidence_quality_score: number | null;
};

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<any>(null);
  const [incidents, setIncidents] = useState<Inc[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
    setCaseRow(c);
    const { data: ins } = await supabase
      .from("incidents")
      .select("id, title, occurred_at, location, people_involved, tags, neutral_summary, evidence_quality_score")
      .eq("case_id", id)
      .order("occurred_at", { ascending: false });
    setIncidents(ins ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const filtered = useMemo(() => {
    if (!q.trim()) return incidents;
    const s = q.toLowerCase();
    return incidents.filter((i) => {
      const blob = [
        i.title, i.location, i.neutral_summary,
        ...(Array.isArray(i.people_involved) ? i.people_involved : []),
        ...(Array.isArray(i.tags) ? i.tags : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(s);
    });
  }, [incidents, q]);

  if (!caseRow) return (<div className="min-h-screen bg-subtle"><AppHeader /><div className="container py-10 text-muted-foreground">Loading…</div></div>);

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10 max-w-5xl">
        <Link to="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> All cases</Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColor(caseRow.category)}`}>{caseRow.category}</span>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold">{caseRow.title}</h1>
            {caseRow.description && <p className="mt-2 text-muted-foreground max-w-2xl">{caseRow.description}</p>}
          </div>
          <div className="flex gap-2">
            <Link to={`/cases/${id}/export`}><Button variant="outline"><FileDown className="mr-2 h-4 w-4" /> Export packet</Button></Link>
            <Link to={`/cases/${id}/incidents/new`}><Button><Plus className="mr-2 h-4 w-4" /> New incident</Button></Link>
          </div>
        </div>

        <div className="mt-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title, people, location, or tag…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 bg-card" />
        </div>

        <div className="mt-8">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-card p-10 text-center text-muted-foreground">
              No incidents yet. Click "New incident" to start.
            </div>
          ) : (
            <ol className="relative border-l-2 border-border ml-2 space-y-6">
              {filtered.map((i) => (
                <li key={i.id} className="pl-6 relative">
                  <span className="absolute -left-[9px] top-3 h-4 w-4 rounded-full bg-accent ring-4 ring-background" />
                  <Link to={`/incidents/${i.id}`} className="block rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-shadow">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-muted-foreground font-mono">{new Date(i.occurred_at).toLocaleString()}</div>
                        <h3 className="mt-1 font-semibold text-lg">{i.title}</h3>
                      </div>
                      {typeof i.evidence_quality_score === "number" && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">Quality {i.evidence_quality_score}</span>
                      )}
                    </div>
                    {i.neutral_summary && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{i.neutral_summary}</p>}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {i.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{i.location}</span>}
                      {Array.isArray(i.people_involved) && i.people_involved.length > 0 && (
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{i.people_involved.join(", ")}</span>
                      )}
                      {Array.isArray(i.tags) && i.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{i.tags.join(", ")}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
};

export default CaseDetail;
