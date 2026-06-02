import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, Shield, MapPin, Users, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type EvidenceItem = {
  filename: string | null;
};

type IncidentExportRow = {
  id: string;
  occurred_at: string;
  title: string;
  neutral_summary: string | null;
  location: string | null;
  people_involved: string[] | null;
  evidence_items: EvidenceItem[] | null;
  evidence_quality_score: number | null;
};

const ExportPreview = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<IncidentExportRow[]>([]);
  const documentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: c } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
      setCaseRow((c as CaseRow | null) ?? null);
      const { data: ins } = await supabase
        .from("incidents")
        .select("*, evidence_items(*)")
        .eq("case_id", id)
        .order("occurred_at", { ascending: true });
      setIncidents((ins as IncidentExportRow[] | null) ?? []);
    })();
  }, [id]);

  if (!caseRow) return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-10 text-muted-foreground text-sm">Loading…</div>
    </AppLayout>
  );

  const generatedAt = new Date().toLocaleString(undefined, {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const downloadPdf = () => {
    if (!documentRef.current) return;
    toast.message("Opening print dialog", {
      description: "Choose “Save as PDF” in your browser/device print options.",
    });
    window.print();
  };

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-3xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            to={`/cases/${id}`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to case
          </Link>
          <Button
            onClick={downloadPdf}
            className="bg-accent hover:bg-accent/90 text-white font-semibold"
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
        </div>

        {/* Evidence packet document */}
        <article ref={documentRef} className="rounded-lg border border-border bg-card shadow-elevated overflow-hidden print:border-0 print:shadow-none">

          {/* Cover / header */}
          <header className="border-b border-border px-10 py-10">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-6">
              <Shield className="h-3.5 w-3.5 text-accent" />
              EVIDENCE PACKET — CONFIDENTIAL
            </div>
            <h1 className="text-2xl md:text-3xl mb-1">{caseRow.title}</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-mono">{caseRow.category}</p>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-border pt-6">
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Generated</div>
                <div className="text-xs text-foreground">{generatedAt}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Incidents</div>
                <div className="text-xs text-foreground font-semibold">{incidents.length}</div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Date Range</div>
                <div className="text-xs text-foreground">
                  {incidents.length > 0
                    ? `${new Date(incidents[0].occurred_at).toLocaleDateString()} – ${new Date(incidents[incidents.length - 1].occurred_at).toLocaleDateString()}`
                    : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Evidence Items</div>
                <div className="text-xs text-foreground font-semibold">
                  {incidents.reduce((sum, i) => sum + (Array.isArray(i.evidence_items) ? i.evidence_items.length : 0), 0)}
                </div>
              </div>
            </div>
          </header>

          {/* Body */}
          <div className="px-10 py-8 space-y-8">
            {/* Case summary */}
            {caseRow.description && (
              <section>
                <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
                  Case Summary
                </h2>
                <p className="text-sm text-foreground" style={{ lineHeight: 1.6 }}>{caseRow.description}</p>
              </section>
            )}

            {/* Chronological incident log */}
            <section>
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
                Chronological Incident Log
              </h2>
              {incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No incidents recorded.</p>
              ) : (
                <ol className="space-y-6">
                  {incidents.map((i, idx) => (
                    <li key={i.id} className="relative pl-8">
                      {/* Incident number */}
                      <div className="absolute left-0 top-0 h-5 w-5 rounded border border-border bg-background flex items-center justify-center">
                        <span className="text-xs font-mono text-muted-foreground">{String(idx + 1).padStart(2, "0")}</span>
                      </div>

                      <div className="text-xs font-mono text-muted-foreground mb-1">
                        {new Date(i.occurred_at).toLocaleString(undefined, {
                          weekday: "short", year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{i.title}</h3>

                      {i.neutral_summary && (
                        <p className="text-sm text-muted-foreground mb-2" style={{ lineHeight: 1.6 }}>
                          {i.neutral_summary}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {i.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {i.location}
                          </span>
                        )}
                        {Array.isArray(i.people_involved) && i.people_involved.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {i.people_involved.join(", ")}
                          </span>
                        )}
                        {Array.isArray(i.evidence_items) && i.evidence_items.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {i.evidence_items.length} attached — {i.evidence_items.map((e) => e.filename).filter(Boolean).join(", ")}
                          </span>
                        )}
                        {typeof i.evidence_quality_score === "number" && (
                          <span className="font-mono">Evidence score: {i.evidence_quality_score}/100</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Footer */}
            <section className="border-t border-border pt-6">
              <Disclaimer />
              <p className="mt-4 text-xs font-mono text-muted-foreground text-center">
                Generated by Proof — {generatedAt}
              </p>
            </section>
          </div>
        </article>
      </main>
    </AppLayout>
  );
};

export default ExportPreview;
