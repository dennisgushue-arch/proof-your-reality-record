import { Link } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIWorkspaceCaseRow, CaseContextSummary } from "../types";

type CaseContextSelectorProps = {
  cases: AIWorkspaceCaseRow[];
  selectedCaseId: string;
  summary: CaseContextSummary | null;
  onSelectCase: (caseId: string) => void;
};

export const CaseContextSelector = ({ cases, selectedCaseId, summary, onSelectCase }: CaseContextSelectorProps) => (
  <section className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-4" aria-labelledby="case-context-title">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300">
        <FolderKanban className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 id="case-context-title" className="text-lg font-black tracking-[-0.03em] text-white">Case context</h2>
        <p className="text-xs text-slate-500">Only records from the selected case are included.</p>
      </div>
    </div>

    {cases.length === 0 ? (
      <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
        <p>No cases are available yet.</p>
        <Button asChild className="mt-3 rounded-xl bg-blue-500 hover:bg-blue-400"><Link to="/cases">Create a case</Link></Button>
      </div>
    ) : (
      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600">Active case</span>
        <select
          value={selectedCaseId}
          onChange={(event) => onSelectCase(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080d15] px-3 py-3 text-sm font-semibold text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Select a case</option>
          {cases.map((caseRow) => <option key={caseRow.id} value={caseRow.id}>{caseRow.title}</option>)}
        </select>
      </label>
    )}

    {summary && (
      <div className="mt-5 space-y-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">{summary.caseRow.category}</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-white">{summary.caseRow.title}</h3>
          {summary.caseRow.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{summary.caseRow.description}</p>}
        </div>
        <dl className="grid grid-cols-2 gap-2">
          <Stat label="Incidents" value={summary.incidentCount} />
          <Stat label="Evidence" value={summary.evidenceCount} />
          <Stat label="Completion" value={`${summary.completionScore}%`} />
          <Stat label="Updated" value={summary.lastUpdatedLabel} />
        </dl>
      </div>
    )}
  </section>
);

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</dt>
    <dd className="mt-1 text-sm font-black text-slate-100">{value}</dd>
  </div>
);
