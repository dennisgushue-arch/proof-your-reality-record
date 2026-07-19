import { Link } from "react-router-dom";
import { ArrowRight, Clock3 } from "lucide-react";
import { formatDate } from "../aiWorkspaceUtils";
import type { TimelineGap } from "../types";

type TimelineGapReviewProps = {
  gaps: TimelineGap[];
  caseId: string;
};

export const TimelineGapReview = ({ gaps, caseId }: TimelineGapReviewProps) => {
  if (gaps.length === 0) return null;
  return (
    <section className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-4" aria-labelledby="timeline-gap-title">
      <div className="flex items-center gap-3">
        <Clock3 className="h-5 w-5 text-cyan-200" aria-hidden="true" />
        <div>
          <h2 id="timeline-gap-title" className="text-lg font-black text-white">Timeline gap review</h2>
          <p className="text-xs text-slate-500">No documented event appears in these intervals.</p>
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {gaps.map((gap) => (
          <article key={gap.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <p className="text-sm font-bold text-slate-100">{formatDate(gap.gapStart)} → {formatDate(gap.gapEnd)}</p>
            <p className="mt-1 text-xs text-slate-500">{gap.durationDays} days between “{gap.startTitle}” and “{gap.endTitle}”.</p>
          </article>
        ))}
      </div>
      <Link to={`/cases/${caseId}/intelligence`} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-200 hover:underline">Review case timeline <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
    </section>
  );
};
