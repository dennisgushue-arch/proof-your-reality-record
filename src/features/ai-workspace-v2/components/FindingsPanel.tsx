import { Link } from "react-router-dom";
import { ArrowRight, ListChecks } from "lucide-react";
import type { WorkspaceFinding } from "../types";

type FindingsPanelProps = {
  findings: WorkspaceFinding[];
};

export const FindingsPanel = ({ findings }: FindingsPanelProps) => (
  <section className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-4" aria-labelledby="findings-panel-title">
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/10 text-cyan-200">
        <ListChecks className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 id="findings-panel-title" className="text-lg font-black tracking-[-0.03em] text-white">Structured findings</h2>
        <p className="text-xs text-slate-500">Flags are review prompts, not factual conclusions.</p>
      </div>
    </div>

    {findings.length === 0 ? (
      <p className="mt-5 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No structured findings are available for the current records.</p>
    ) : (
      <div className="mt-5 space-y-3">
        {findings.map((finding) => (
          <article key={finding.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">{finding.category.replace(/-/g, " ")}</p>
                <h3 className="mt-1 text-sm font-black text-slate-100">{finding.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{finding.description}</p>
                {finding.priority && <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Priority: {finding.priority}</p>}
              </div>
              {finding.href && <Link to={finding.href} aria-label={`Open ${finding.title}`} className="rounded-full p-2 text-blue-300 transition hover:bg-blue-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
            </div>
          </article>
        ))}
      </div>
    )}
  </section>
);
