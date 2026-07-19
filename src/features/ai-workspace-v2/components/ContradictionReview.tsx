import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { formatDate } from "../aiWorkspaceUtils";
import type { StatementDifference } from "../types";

type ContradictionReviewProps = {
  items: StatementDifference[];
};

export const ContradictionReview = ({ items }: ContradictionReviewProps) => {
  if (items.length === 0) return null;
  return (
    <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[0.05] p-4" aria-labelledby="statement-difference-title">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-200" aria-hidden="true" />
        <div>
          <h2 id="statement-difference-title" className="text-lg font-black text-white">Possible statement difference</h2>
          <p className="text-xs text-amber-100/70">Two recorded statements appear to differ and may warrant review.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl border border-white/[0.06] bg-[#0B111A]/80 p-3">
            <p className="text-xs text-slate-500">{item.incidentTitle} · {formatDate(item.occurredAt)}</p>
            <p className="mt-2 text-sm text-slate-200">{item.firstStatement}</p>
            {item.secondStatement && <p className="mt-2 text-sm text-slate-400">{item.secondStatement}</p>}
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.explanation}</p>
            <Link to={`/incidents/${item.incidentId}`} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-200 hover:underline">Open record <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </article>
        ))}
      </div>
    </section>
  );
};
