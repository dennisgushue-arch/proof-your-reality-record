import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ExportPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      setCaseRow(c);
      const { data: ins } = await supabase.from("incidents").select("*, evidence_items(*)").eq("case_id", id).order("occurred_at", { ascending: true });
      setIncidents(ins ?? []);
    })();
  }, [id]);

  if (!caseRow) return (<div className="min-h-screen bg-subtle"><AppHeader /><div className="container py-10 text-muted-foreground">Loading…</div></div>);

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <div className="flex items-center justify-between">
          <Link to={`/cases/${id}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to case</Link>
          <Button onClick={() => toast.message("PDF export coming soon", { description: "Pro tier will enable downloadable PDF packets." })}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
        </div>

        {/* Packet preview */}
        <article className="mt-6 rounded-xl bg-white shadow-elevated border border-border overflow-hidden">
          {/* Cover */}
          <div className="bg-hero text-navy-foreground p-10">
            <div className="flex items-center gap-2 text-sm text-white/70"><Shield className="h-4 w-4" /> Evidence Packet</div>
            <h1 className="mt-6 text-3xl md:text-4xl font-semibold text-white">{caseRow.title}</h1>
            <p className="mt-2 text-white/70">{caseRow.category}</p>
            <div className="mt-10 grid grid-cols-2 gap-6 text-sm">
              <div><div className="text-white/60 uppercase text-xs tracking-wider">Generated</div><div className="mt-1 text-white">{new Date().toLocaleString()}</div></div>
              <div><div className="text-white/60 uppercase text-xs tracking-wider">Incidents</div><div className="mt-1 text-white">{incidents.length}</div></div>
            </div>
          </div>

          <div className="p-10 space-y-10">
            <section>
              <h2 className="text-xl font-semibold">Case summary</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{caseRow.description || "No additional description provided."}</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">Chronological timeline</h2>
              <ol className="mt-4 space-y-6 border-l-2 border-border pl-6">
                {incidents.map((i) => (
                  <li key={i.id} className="relative">
                    <span className="absolute -left-[31px] top-2 h-3 w-3 rounded-full bg-accent ring-4 ring-white" />
                    <div className="text-xs font-mono text-muted-foreground">{new Date(i.occurred_at).toLocaleString()}</div>
                    <h3 className="mt-1 font-semibold">{i.title}</h3>
                    {i.neutral_summary && <p className="mt-1 text-sm text-muted-foreground">{i.neutral_summary}</p>}
                    <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                      {i.location && <div><span className="font-medium">Location:</span> {i.location}</div>}
                      {Array.isArray(i.people_involved) && i.people_involved.length > 0 && (
                        <div><span className="font-medium">People:</span> {i.people_involved.join(", ")}</div>
                      )}
                      {Array.isArray(i.evidence_items) && i.evidence_items.length > 0 && (
                        <div><span className="font-medium">Evidence:</span> {i.evidence_items.map((e: any) => e.filename).join(", ")}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="border-t pt-6">
              <Disclaimer />
            </section>
          </div>
        </article>
      </main>
    </div>
  );
};

export default ExportPreview;
