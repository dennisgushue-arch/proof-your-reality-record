import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ExportReadinessModel } from "../types";

type ExportReadinessProps = {
  readiness: ExportReadinessModel;
};

export const ExportReadiness = ({ readiness }: ExportReadinessProps) => (
  <section className="print:hidden rounded-2xl border border-border bg-card p-5 shadow-card" aria-labelledby="export-readiness-title">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-1 h-5 w-5 text-accent" aria-hidden="true" />
      <div>
        <h2 id="export-readiness-title" className="text-lg font-semibold">Export readiness</h2>
        <p className="mt-1 text-sm text-muted-foreground">Review what will be included before sharing.</p>
      </div>
    </div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
      <Stat label="Case" value={readiness.caseTitle} />
      <Stat label="Completion" value={`${readiness.completionScore}%`} />
      <Stat label="Incidents" value={readiness.incidentCount} />
      <Stat label="Evidence" value={readiness.evidenceCount} />
      <Stat label="Timeline gaps" value={readiness.timelineGapCount} />
      <Stat label="Possible statement differences" value={readiness.statementDifferenceCount} />
    </dl>
    <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
      <div className="flex gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>Exports may contain sensitive personal information. Review content before sharing. Proof is not a law firm.</p>
      </div>
    </div>
    {readiness.missingDocumentation.length > 0 && (
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Missing documentation</h3>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {readiness.missingDocumentation.map((item) => <li key={item}>• {item}</li>)}
        </ul>
      </div>
    )}
    <div className="mt-4">
      <h3 className="text-sm font-semibold">Selected sections</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {readiness.selectedSections.map((section) => <span key={section.id} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">{section.label}</span>)}
      </div>
    </div>
  </section>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-xl border border-border bg-muted/20 p-3">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words text-sm font-semibold text-foreground">{value}</dd>
  </div>
);
