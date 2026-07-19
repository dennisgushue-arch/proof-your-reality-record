import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, FolderKanban } from "lucide-react";
import type { CaseRow } from "../types";
import { relTime } from "../dashboardUtils";

type ContinueCasesProps = {
  cases: CaseRow[];
};

export const ContinueCases = ({ cases }: ContinueCasesProps) => {
  return (
    <section className="rounded-[26px] bg-[#0B111A] p-5 sm:p-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Continue working</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Active cases</h2>
        </div>
        <Link to="/cases" className="flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {cases.slice(0, 4).map((caseItem, index) => {
          const count = caseItem.incidents?.[0]?.count ?? 0;

          return (
            <Link
              key={caseItem.id}
              to={`/cases/${caseItem.id}`}
              className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] p-4 transition hover:bg-blue-400/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                <FolderKanban className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{caseItem.category || "Case"}</span>
                  {index === 0 && (
                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-300">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm font-bold text-slate-100">{caseItem.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {count} {count === 1 ? "incident" : "incidents"} · {relTime(caseItem.updated_at)}
                </p>
              </div>

              <ChevronRight className="h-5 w-5 text-slate-700 transition group-hover:translate-x-0.5 group-hover:text-blue-300" />
            </Link>
          );
        })}
      </div>
    </section>
  );
};
