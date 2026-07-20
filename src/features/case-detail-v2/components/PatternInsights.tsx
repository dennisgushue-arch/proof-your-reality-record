import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import type { PatternInsightItem } from "../types";

type PatternInsightsProps = {
  insights: PatternInsightItem[];
};

export const PatternInsights = ({ insights }: PatternInsightsProps) => {
  return (
    <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6">
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Pattern insights</p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">What Proof is noticing</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight) => {
          const Icon = insight.tone === "positive" ? CheckCircle2 : insight.tone === "warning" ? AlertTriangle : CircleDashed;
          const iconClass = insight.tone === "positive" ? "text-emerald-300 bg-emerald-400/10" : insight.tone === "warning" ? "text-amber-300 bg-amber-400/10" : "text-slate-300 bg-white/[0.05]";

          return (
            <article key={insight.id} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  {insight.metric}
                </span>
              </div>
              <h3 className="mt-4 text-sm font-black text-white">{insight.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">{insight.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
