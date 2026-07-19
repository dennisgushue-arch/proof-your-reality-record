import { AlertTriangle, ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react";
import type { CaseContextSummary } from "../types";

type IntelligenceOverviewProps = {
  summary: CaseContextSummary;
};

export const IntelligenceOverview = ({ summary }: IntelligenceOverviewProps) => (
  <section className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-5" aria-labelledby="intelligence-overview-title">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Case intelligence</p>
    <h2 id="intelligence-overview-title" className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">Available record overview</h2>
    <p className="mt-2 text-sm leading-6 text-slate-400">{summary.intelligence.status}</p>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ClipboardCheck} label="Documentation completion" value={`${summary.completionScore}%`} />
      <Metric icon={ShieldCheck} label="Evidence strength" value={summary.intelligence.strengthLabel} />
      <Metric icon={FileSearch} label="Timeline gaps" value={summary.timelineGaps.length} />
      <Metric icon={AlertTriangle} label="Possible statement differences" value={summary.statementDifferences.length} />
    </div>

    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <h3 className="text-sm font-bold text-slate-100">Missing documentation</h3>
        {summary.intelligence.missing.length ? (
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            {summary.intelligence.missing.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-500">No major missing documentation currently flagged.</p>}
      </div>
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <h3 className="text-sm font-bold text-slate-100">Available evidence</h3>
        <p className="mt-3 text-sm leading-6 text-slate-400">{summary.evidenceCount} evidence item{summary.evidenceCount === 1 ? "" : "s"} connected to {summary.incidentCount} incident record{summary.incidentCount === 1 ? "" : "s"}.</p>
      </div>
    </div>
  </section>
);

const Metric = ({ icon: Icon, label, value }: { icon: typeof ClipboardCheck; label: string; value: string | number }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-[#080d15] p-4">
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">
      <Icon className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" /> {label}
    </div>
    <div className="mt-2 text-2xl font-black text-white">{value}</div>
  </div>
);
