import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryColor } from "@/lib/categories";
import type { CaseDetailCaseRow } from "../types";

type CaseHeaderProps = {
  caseRow: CaseDetailCaseRow;
  activeLiveSessionId?: string | null;
};

export const CaseHeader = ({ caseRow, activeLiveSessionId }: CaseHeaderProps) => {
  const liveSessionHref = activeLiveSessionId
    ? `/cases/${caseRow.id}/incidents/new?liveSession=${encodeURIComponent(activeLiveSessionId)}`
    : undefined;

  return (
    <header>
      <Link to="/dashboard" className="inline-flex items-center text-xs font-bold uppercase tracking-[0.14em] text-slate-600 hover:text-slate-300">
        <ArrowLeft className="mr-2 h-3.5 w-3.5" />
        All cases
      </Link>

      <section className="mt-5 rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${categoryColor(caseRow.category)}`}>
              {caseRow.category}
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-[-0.04em] text-white sm:text-3xl">{caseRow.title}</h1>
            {caseRow.description && <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">{caseRow.description}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            {liveSessionHref && (
              <Link to={liveSessionHref} className="w-full sm:w-auto">
                <Button variant="outline" className="h-11 w-full rounded-xl border-emerald-400/20 bg-emerald-400/10 font-bold text-emerald-100 hover:bg-emerald-400/15">
                  <Radio className="mr-2 h-4 w-4" />
                  Create from live session
                </Button>
              </Link>
            )}
            <Link to={`/cases/${caseRow.id}/incidents/new`} className="w-full sm:w-auto">
              <Button className="h-11 w-full rounded-xl bg-blue-500 px-5 font-bold hover:bg-blue-400">
                <Plus className="mr-2 h-4 w-4" />
                New incident
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </header>
  );
};
