import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Search, FileDown, MapPin, Users, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { categoryColor } from "@/lib/categories";

type Inc = {
  id: string;
  title: string;
  occurred_at: string;
  location: string | null;
  people_involved: any;
  tags: any;
  neutral_summary: string | null;
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

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

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

  if (!caseRow) return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-10 text-muted-foreground text-sm">Loading…</div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-4xl">
        <Link
          to="/dashboard"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All cases
        </Link>

        {/* Case header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div>
            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${categoryColor(caseRow.category)}`}>
              {caseRow.category}
            </span>
            <h1 className="mt-3 text-3xl md:text-4xl">{caseRow.title}</h1>
            {caseRow.description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl" style={{ lineHeight: 1.6 }}>
                {caseRow.description}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to={`/cases/${id}/export`}>
              <Button variant="outline" className="border-border">
                <FileDown className="mr-2 h-4 w-4" /> Export Packet
              </Button>
            </Link>
            <Link to={`/cases/${id}/incidents/new`}>
              <Button className="bg-accent hover:bg-accent/90 text-white font-semibold">
                <Plus className="mr-2 h-4 w-4" /> New Incident
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents by title, people, location, or tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {/* Forensic timeline */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
            <p className="text-sm">No incidents yet. Click "New Incident" to start your evidence timeline.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {filtered.map((i, idx) => (
              <div key={i.id} className="relative flex gap-5">
                {/* Timeline spine */}
                <div className="flex flex-col items-center shrink-0 w-8">
                  <div className="h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-background mt-4 shrink-0 z-10" />
                  {idx < filtered.length - 1 && (
                    <div className="w-px flex-1 bg-border mt-1" />
                  )}
                </div>

                {/* Incident card */}
                <Link
                  to={`/incidents/${i.id}`}
                  className="block flex-1 mb-4 rounded-lg border border-border bg-card p-5 shadow-card hover:shadow-elevated hover:border-accent/30 transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div className="text-xs font-mono text-muted-foreground">
                      {new Date(i.occurred_at).toLocaleString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </div>
                    {typeof i.evidence_quality_score === "number" && (
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded border"
                        style={{
                          color: i.evidence_quality_score >= 70 ? "hsl(145 63% 49%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 61%)" : "hsl(6 78% 57%)",
                          borderColor: i.evidence_quality_score >= 70 ? "hsl(145 63% 30%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 40%)" : "hsl(6 78% 40%)",
                          background: i.evidence_quality_score >= 70 ? "hsl(145 63% 10%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 10%)" : "hsl(6 78% 10%)",
                        }}
                      >
                        Score {i.evidence_quality_score}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-base">{i.title}</h3>
                  {i.neutral_summary && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2" style={{ lineHeight: 1.6 }}>
                      {i.neutral_summary}
                    </p>
                  )}
                  {(i.location || (Array.isArray(i.people_involved) && i.people_involved.length > 0) || (Array.isArray(i.tags) && i.tags.length > 0)) && (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {i.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />{i.location}
                        </span>
                      )}
                      {Array.isArray(i.people_involved) && i.people_involved.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />{i.people_involved.join(", ")}
                        </span>
                      )}
                      {Array.isArray(i.tags) && i.tags.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5" />{i.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </AppLayout>
  );
};

export default CaseDetail;
