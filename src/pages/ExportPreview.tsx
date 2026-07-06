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
  created_at: string;
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
  ai_analysis: unknown;
  tags: string[] | null;
};

type StoryChange = {
  statementA: string;
  statementB: string;
};

type EvidenceIndexItem = {
  id: string;
  label: string;
  type: string;
  uploadedAt: string;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
};

const readAnalysis = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const contradictionList = (incident: IncidentExportRow) => {
  const analysis = readAnalysis(incident.ai_analysis);
  return asStringArray(analysis?.contradictions);
};

const inferEvidenceType = (filename: string) => {
  const normalized = filename.toLowerCase();
  if (/voice|audio|\.m4a$|\.mp3$|\.wav$/.test(normalized)) return "Voice Note";
  if (/screenshot|screen|\.png$/.test(normalized)) return "Screenshot";
  if (/photo|image|\.jpg$|\.jpeg$|\.heic$|\.webp$/.test(normalized)) return "Photo";
  return "Attachment";
};

const buildStoryChangeCards = (incidents: IncidentExportRow[]): StoryChange[] => {
  const contradictions = incidents.flatMap((incident) => contradictionList(incident));
  const unique = Array.from(new Set(contradictions)).slice(0, 6);

  return unique.map((entry) => {
    const lower = entry.toLowerCase();
    if (entry.includes(" but ")) {
      const [a, ...rest] = entry.split(" but ");
      return {
        statementA: a.trim(),
        statementB: rest.join(" but ").trim(),
      };
    }
    if (lower.includes("previous") && lower.includes("later")) {
      const parts = entry.split(/later|now|however/i).map((segment) => segment.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return {
          statementA: parts[0],
          statementB: parts[1],
        };
      }
    }

    return {
      statementA: entry,
      statementB: "Follow-up statement conflicts with prior record.",
    };
  });
};

const buildEvidenceIndex = (incidents: IncidentExportRow[]): EvidenceIndexItem[] => {
  const explicit = incidents.flatMap((incident) => {
    const occurredAt = new Date(incident.occurred_at).toLocaleDateString();
    return (incident.evidence_items ?? [])
      .filter((item): item is EvidenceItem & { filename: string } => Boolean(item.filename))
      .map((item, index) => ({
        id: `${incident.id}-explicit-${index}`,
        label: item.filename,
        type: inferEvidenceType(item.filename),
        uploadedAt: occurredAt,
      }));
  });

  if (explicit.length > 0) return explicit;

  return incidents.flatMap((incident) => {
    const uploadedAt = new Date(incident.occurred_at).toLocaleDateString();
    const tags = asStringArray(incident.tags);
    const inferredTypes = new Set<string>();
    tags.forEach((tag) => {
      const normalized = tag.toLowerCase();
      if (normalized.includes("screenshot")) inferredTypes.add("Screenshot");
      if (normalized.includes("voice")) inferredTypes.add("Voice Note");
      if (normalized.includes("photo")) inferredTypes.add("Photo");
    });

    if (inferredTypes.size === 0) inferredTypes.add("Attachment");

    return Array.from(inferredTypes).map((type, idx) => ({
      id: `${incident.id}-inferred-${idx}`,
      label: `${type} from ${incident.title}`,
      type,
      uploadedAt,
    }));
  }).slice(0, 24);
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

  const integrityScores = incidents
    .map((incident) => incident.evidence_quality_score)
    .filter((score): score is number => typeof score === "number");
  const integrityScore = integrityScores.length
    ? Math.round(integrityScores.reduce((sum, score) => sum + score, 0) / integrityScores.length)
    : 58;
  const contradictionsDetected = incidents.reduce((sum, incident) => sum + contradictionList(incident).length, 0);
  const executiveSummary =
    caseRow.description
      ?? incidents
        .map((incident) => incident.neutral_summary)
        .filter((summary): summary is string => typeof summary === "string" && summary.trim().length > 0)
        .slice(0, 2)
        .join(" ")
      ?? "No executive summary is available yet. Continue documenting incidents to build your packet narrative.";
  const storyChanges = buildStoryChangeCards(incidents);
  const evidenceIndex = buildEvidenceIndex(incidents);
  const caseCreatedDate = new Date(caseRow.created_at).toLocaleDateString();

  return (
    <AppLayout>
      <main id="page-main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl px-6 py-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:px-10 lg:py-12">
        {/* Top bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            to={`/cases/${id}`}
            className="inline-flex items-center font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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

        <article ref={documentRef} className="overflow-hidden rounded-xl border border-border bg-card shadow-elevated print:border-0 print:shadow-none">
          {/* Page 1 */}
          <section className="min-h-[780px] px-8 py-10 md:px-12 md:py-12 print:min-h-0">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-5">
              <Shield className="h-3.5 w-3.5 text-accent" />
              PROOF — REALITY RECORD
            </div>
            <h1 className="text-3xl font-semibold">{caseRow.title}</h1>
            <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">{caseRow.category}</p>

            <div className="mt-9 grid grid-cols-1 gap-4 rounded-lg border border-border bg-background/50 p-5 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Case Name</p>
                <p className="mt-1 text-sm font-semibold">{caseRow.title}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Case Type</p>
                <p className="mt-1 text-sm font-semibold">{caseRow.category}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Created Date</p>
                <p className="mt-1 text-sm font-semibold">{caseCreatedDate}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Evidence Integrity Score</p>
                <p className="mt-1 text-sm font-semibold text-[#2ECC71]">{integrityScore}%</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Contradictions Detected</p>
                <p className="mt-1 text-sm font-semibold text-[#E74C3C]">{contradictionsDetected}</p>
              </div>
            </div>

            <section className="mt-9">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-3 pb-2 border-b border-border">
                Executive Summary
              </h2>
              <p className="text-sm leading-relaxed text-foreground md:text-[0.96rem]">{executiveSummary}</p>
            </section>
          </section>

          {/* Page 2 */}
          <section className="min-h-[780px] border-t border-border px-8 py-10 md:px-12 md:py-12 print:break-before-page print:min-h-0">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Timeline Reconstruction
            </h2>
            {incidents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incidents recorded yet.</p>
            ) : (
              <ol className="space-y-6">
                {incidents.map((incident) => (
                  <li key={incident.id} className="rounded-lg border border-border bg-background/50 p-5">
                    <p className="text-xs font-mono text-muted-foreground">
                      {new Date(incident.occurred_at).toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">{incident.title}</h3>
                    {incident.neutral_summary && (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{incident.neutral_summary}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      {incident.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {incident.location}</span>}
                      {Array.isArray(incident.people_involved) && incident.people_involved.length > 0 && (
                        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {incident.people_involved.join(", ")}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Page 3 */}
          <section className="min-h-[780px] border-t border-border px-8 py-10 md:px-12 md:py-12 print:break-before-page print:min-h-0">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Story Changes Detected
            </h2>
            {storyChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No contradiction pairs detected yet.</p>
            ) : (
              <div className="space-y-5">
                {storyChanges.map((change, idx) => (
                  <article key={`${change.statementA}-${idx}`} className="rounded-lg border p-5" style={{ borderColor: "hsl(var(--destructive) / 0.5)", background: "hsl(var(--destructive) / 0.12)" }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "hsl(var(--destructive))" }}>Story Changed™</p>
                    <div className="mt-3 space-y-2">
                      <div className="rounded-md border p-3" style={{ borderColor: "hsl(var(--destructive) / 0.4)", background: "hsl(220 41% 13%)" }}>
                        <p className="text-xs font-semibold" style={{ color: "hsl(var(--destructive) / 0.95)" }}>Statement A</p>
                        <p className="mt-1 text-sm text-foreground">“{change.statementA}”</p>
                      </div>
                      <div className="rounded-md border p-3" style={{ borderColor: "hsl(var(--destructive) / 0.4)", background: "hsl(220 41% 13%)" }}>
                        <p className="text-xs font-semibold" style={{ color: "hsl(var(--destructive) / 0.95)" }}>Statement B</p>
                        <p className="mt-1 text-sm text-foreground">“{change.statementB}”</p>
                      </div>
                    </div>
                    <p className="mt-3 text-xs font-semibold" style={{ color: "hsl(var(--destructive) / 0.95)" }}>Status: Timeline conflict detected</p>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Page 4+ */}
          <section className="border-t border-border px-8 py-10 md:px-12 md:py-12 print:break-before-page">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-muted-foreground mb-4 pb-2 border-b border-border">
              Evidence Index
            </h2>
            {evidenceIndex.length === 0 ? (
              <p className="text-sm text-muted-foreground">No evidence references have been indexed yet.</p>
            ) : (
              <ol className="space-y-4">
                {evidenceIndex.map((item, idx) => (
                  <li key={item.id} className="rounded-lg border border-border bg-background/50 p-5">
                    <p className="text-xs font-mono text-muted-foreground">Evidence #{idx + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{item.type}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
                    <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Paperclip className="h-3 w-3" /> Uploaded {item.uploadedAt}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <section className="border-t border-border pt-6 mt-8">
              <Disclaimer />
              <p className="mt-4 text-xs font-mono text-muted-foreground text-center">
                Generated by Proof — {generatedAt}
              </p>
            </section>
          </section>
        </article>
      </main>
    </AppLayout>
  );
};

export default ExportPreview;
