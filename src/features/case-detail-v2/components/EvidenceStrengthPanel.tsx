import { ShieldCheck, TrendingUp } from "lucide-react";
import type { CaseIntelligence } from "@/lib/caseIntelligence";
import { getEvidenceTone, getEvidenceToneClasses, getIncidentCompleteness } from "../caseDetailUtils";
import type { CaseDetailIncidentRow } from "../types";

type EvidenceStrengthPanelProps = {
  intelligence: CaseIntelligence;
  incidents: CaseDetailIncidentRow[];
  completionPercentage: number;
};

export const EvidenceStrengthPanel = ({ intelligence, incidents, completionPercentage }: EvidenceStrengthPanelProps) => {
  const tone = getEvidenceTone(intelligence.evidenceStrength);
  const averageCompleteness = incidents.length
    ? Math.round(incidents.reduce((sum, incident) => sum + getIncidentCompleteness(incident), 0) / incidents.length)
    : 0;

  return (
    <section className="rounded-[32px] border border-white/[0.06] bg-[#0B111A] p-6 sm:p-7" aria-labelledby="evidence-strength-title">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Evidence strength</p>
          <h2 id="evidence-strength-title" className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">Documentation metrics</h2>
        </div>
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${getEvidenceToneClasses(tone)}`} aria-hidden="true">
          <ShieldCheck className="h-5 w-5" />
        </span>
      </div>

      <div
        className="mt-5 h-3 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-label="Evidence strength"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={intelligence.evidenceStrength}
      >
        <div className="h-full rounded-full bg-blue-400" style={{ width: `${intelligence.evidenceStrength}%` }} />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Completion" value={`${completionPercentage || averageCompleteness}%`} />
        <Metric label="Strength" value={`${intelligence.evidenceStrength}%`} />
        <Metric label="Evidence files" value={intelligence.evidenceItemCount.toString()} />
      </div>

      <div className="mt-5 rounded-2xl bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <TrendingUp className="h-4 w-4 text-blue-300" aria-hidden="true" />
          Why this score
        </div>
        {intelligence.reasons.length > 0 ? (
          <ul className="space-y-2 text-sm leading-6 text-slate-400">
            {intelligence.reasons.map((reason) => (
              <li key={reason}>• {reason}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm leading-6 text-slate-500">Add incidents and supporting evidence to build a stronger reliability score.</p>
        )}
      </div>
    </section>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
    <p className="mt-1 text-lg font-black text-white">{value}</p>
  </div>
);
