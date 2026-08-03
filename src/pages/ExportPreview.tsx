import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FilePlus2, MapPin, Paperclip, Shield, Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Disclaimer } from "@/components/Disclaimer";
import { ExportOptions } from "@/features/release-v1/components/ExportOptions";
import { ExportReadiness } from "@/features/release-v1/components/ExportReadiness";
import { GlobalErrorState } from "@/features/release-v1/components/GlobalErrorState";
import {
  buildClipboardExport,
  buildExportReadiness,
  createDefaultExportSections,
  labelAIExportContent,
  normalizeSafeError,
  selectedSectionIds,
} from "@/features/release-v1/releaseUtils";
import type { ExportSection, ReleaseIncident } from "@/features/release-v1/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ContextualLoading } from "@/components/ContextualLoading";
import { markActivationMilestone } from "@/lib/activationProgress";
import { useAuth } from "@/contexts/AuthContext";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type IncidentExportRow = ReleaseIncident;

function readAnalysisArray(ai: unknown, key: string): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const value = (ai as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

const ExportPreview = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<IncidentExportRow[]>([]);
  const [sections, setSections] = useState<ExportSection[]>(() => createDefaultExportSections());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const documentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(null);

      const { data: c, error: caseError } = await supabase
        .from("cases")
        .select("id, title, category, description")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (caseError) {
        setLoadError("Case export could not be loaded. Please try again.");
        setLoading(false);
        return;
      }

      setCaseRow((c as CaseRow | null) ?? null);

      const { data: ins, error: incidentError } = await supabase
        .from("incidents")
        .select("id, case_id, occurred_at, title, raw_narrative, neutral_summary, location, people_involved, ai_analysis, evidence_items(id, filename, type)")
        .eq("case_id", id)
        .order("occurred_at", { ascending: true });

      if (cancelled) return;
      if (incidentError) {
        setLoadError("Incident records could not be loaded for export. Please try again.");
        setIncidents([]);
        setLoading(false);
        return;
      }

      setIncidents((ins as IncidentExportRow[] | null) ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const enabledSections = useMemo(() => new Set(selectedSectionIds(sections)), [sections]);
  const readiness = useMemo(() => caseRow ? buildExportReadiness(caseRow, incidents, sections) : null, [caseRow, incidents, sections]);

  const generatedAt = new Date().toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    if (!documentRef.current) return;
    markActivationMilestone("export", undefined, user?.id);
    toast.message("Opening print dialog", {
      description: "Choose “Save as PDF” in your browser/device print options.",
    });
    window.print();
  };

  const handleCopy = async () => {
    if (!caseRow) return;
    try {
      await navigator.clipboard.writeText(buildClipboardExport(caseRow, incidents, sections));
      markActivationMilestone("export", undefined, user?.id);
      toast.success("Export ready", { description: "The prepared record was copied. Review it before sharing outside Proof." });
    } catch (error) {
      const safe = normalizeSafeError(error, "Could not copy the prepared export. Your section selections were preserved.");
      toast.error(safe.title, { description: safe.message });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <ContextualLoading title="Preparing export…" detail="Building the selected case sections and checking documentation readiness." />
      </AppLayout>
    );
  }

  if (loadError) {
    return (
      <AppLayout>
        <main className="mx-auto max-w-3xl px-6 py-10 lg:px-10">
          <GlobalErrorState title="Export unavailable" message={loadError} onRetry={() => window.location.reload()} />
        </main>
      </AppLayout>
    );
  }

  if (!caseRow) {
    return (
      <AppLayout>
        <main className="mx-auto max-w-3xl px-6 py-10 lg:px-10">
          <GlobalErrorState title="Case unavailable" message="This case may have been removed or is unavailable." />
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
          <Link to={`/cases/${id}`} className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" aria-hidden="true" /> Back to case
          </Link>
          <p className="max-w-xl text-xs text-muted-foreground">
            Review included sections before exporting. Browser print is the supported PDF path.
          </p>
        </div>

        {incidents.length === 0 && (
          <section className="mb-6 rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center print:hidden">
            <FilePlus2 className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-2xl font-semibold">Your export needs its first incident</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Add an incident and supporting evidence before preparing a useful case packet. Your export options will be ready when you return.</p>
            <Button asChild className="mt-5"><Link to={`/record?caseId=${id}`}>Create first incident</Link></Button>
          </section>
        )}

        <div className="mb-6 grid gap-4 print:hidden lg:grid-cols-[1fr_0.9fr]">
          <ExportOptions
            sections={sections}
            onToggleSection={(sectionId, selected) => setSections((current) => current.map((section) => section.id === sectionId ? { ...section, selected } : section))}
            onPrint={handlePrint}
            onCopy={handleCopy}
            copyDisabled={incidents.length === 0}
          />
          {readiness && <ExportReadiness readiness={readiness} />}
        </div>

        <article ref={documentRef} className="release-export-document overflow-hidden rounded-lg border border-border bg-card shadow-elevated print:border-0 print:bg-white print:text-black print:shadow-none">
          <header className="border-b border-border px-6 py-8 sm:px-10 sm:py-10 print:border-neutral-300">
            <div className="mb-6 flex items-center gap-2 text-xs font-mono text-muted-foreground print:text-neutral-600">
              <Shield className="h-3.5 w-3.5 text-accent print:text-neutral-700" aria-hidden="true" />
              EVIDENCE PACKET — REVIEW BEFORE SHARING
            </div>
            <h1 className="mb-1 break-words text-2xl md:text-3xl print:text-black">{caseRow.title}</h1>
            <p className="text-sm uppercase tracking-widest text-muted-foreground print:text-neutral-600">{caseRow.category}</p>
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 md:grid-cols-4 print:border-neutral-300">
              <CoverStat label="Generated" value={generatedAt} />
              <CoverStat label="Incidents" value={incidents.length} />
              <CoverStat label="Date Range" value={incidents.length > 0 ? `${new Date(incidents[0].occurred_at).toLocaleDateString()} – ${new Date(incidents[incidents.length - 1].occurred_at).toLocaleDateString()}` : "—"} />
              <CoverStat label="Evidence Items" value={incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0)} />
            </div>
          </header>

          <div className="space-y-8 px-6 py-8 sm:px-10 print:text-black">
            {enabledSections.has("overview") && caseRow.description && (
              <DocumentSection title="Case overview">
                <p className="text-sm leading-7 text-foreground print:text-black">{caseRow.description}</p>
              </DocumentSection>
            )}

            {enabledSections.has("timeline") && (
              <DocumentSection title="Chronological timeline">
                {incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents recorded.</p> : (
                  <ol className="space-y-3">
                    {incidents.map((incident) => <li key={incident.id} className="text-sm"><span className="font-mono text-muted-foreground print:text-neutral-600">{new Date(incident.occurred_at).toLocaleString()}</span> — {incident.title}</li>)}
                  </ol>
                )}
              </DocumentSection>
            )}

            {enabledSections.has("incidents") && (
              <DocumentSection title="Incident summaries">
                {incidents.length === 0 ? <p className="text-sm text-muted-foreground">No incidents recorded.</p> : (
                  <ol className="space-y-6">
                    {incidents.map((incident, index) => (
                      <li key={incident.id} className="break-inside-avoid-page relative pl-8">
                        <div className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded border border-border bg-background print:border-neutral-400 print:bg-white">
                          <span className="text-xs font-mono text-muted-foreground print:text-neutral-700">{String(index + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="mb-1 text-xs font-mono text-muted-foreground print:text-neutral-600">{new Date(incident.occurred_at).toLocaleString()}</div>
                        <h3 className="mb-1 text-sm font-semibold print:text-black">{incident.title}</h3>
                        {(incident.neutral_summary || incident.raw_narrative) && <p className="mb-2 text-sm leading-7 text-muted-foreground print:text-neutral-800">{incident.neutral_summary || incident.raw_narrative}</p>}
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground print:text-neutral-700">
                          {incident.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" /> {incident.location}</span>}
                          {Array.isArray(incident.people_involved) && incident.people_involved.length > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" aria-hidden="true" /> {incident.people_involved.filter((item): item is string => typeof item === "string").join(", ")}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </DocumentSection>
            )}

            {enabledSections.has("evidence") && (
              <DocumentSection title="Evidence inventory">
                <ul className="space-y-2 text-sm text-muted-foreground print:text-neutral-800">
                  {incidents.flatMap((incident) => (incident.evidence_items ?? []).map((item) => <li key={`${incident.id}-${item.id ?? item.filename}`} className="break-inside-avoid-page"><Paperclip className="mr-1 inline h-3 w-3" aria-hidden="true" /> {incident.title}: {item.filename || item.type || "Evidence item"}</li>))}
                </ul>
              </DocumentSection>
            )}

            {enabledSections.has("differences") && (
              <DocumentSection title="Possible statement differences">
                <ul className="space-y-2 text-sm text-muted-foreground print:text-neutral-800">
                  {incidents.flatMap((incident) => readAnalysisArray(incident.ai_analysis, "contradictions").map((item) => <li key={`${incident.id}-${item}`}>AI-generated observation — {incident.title}: {item}</li>))}
                </ul>
              </DocumentSection>
            )}

            {enabledSections.has("ai") && (
              <DocumentSection title="AI-generated observations">
                <ul className="space-y-2 text-sm text-muted-foreground print:text-neutral-800">
                  {incidents.flatMap((incident) => readAnalysisArray(incident.ai_analysis, "key_claims").map((item) => <li key={`${incident.id}-${item}`}>{labelAIExportContent(`${incident.title}: ${item}`)}</li>))}
                </ul>
              </DocumentSection>
            )}

            <section className="break-inside-avoid-page border-t border-border pt-6 print:border-neutral-300">
              <Disclaimer />
              <p className="mt-4 text-center text-xs font-mono text-muted-foreground print:text-neutral-600">Generated by Proof — {generatedAt}</p>
            </section>
          </div>
        </article>
      </main>
    </AppLayout>
  );
};

const CoverStat = ({ label, value }: { label: string; value: string | number }) => (
  <div>
    <div className="mb-1 text-xs font-mono uppercase text-muted-foreground print:text-neutral-600">{label}</div>
    <div className="break-words text-xs font-semibold text-foreground print:text-black">{value}</div>
  </div>
);

const DocumentSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="break-inside-avoid-page">
    <h2 className="mb-4 border-b border-border pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground print:border-neutral-300 print:text-neutral-700">{title}</h2>
    {children}
  </section>
);

export default ExportPreview;
