import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardRecommendation } from "../types";

type RecommendedActionProps = {
  recommendation: DashboardRecommendation;
};

export const RecommendedAction = ({ recommendation }: RecommendedActionProps) => {
  return (
    <section className="rounded-[26px] bg-[#0B111A] p-5 sm:p-7">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10">
          <Sparkles className="h-5 w-5 text-amber-300" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">{recommendation.category}</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.025em] text-white">{recommendation.title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{recommendation.description}</p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right md:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Potential gain</p>
            <p className="text-lg font-black text-emerald-300">{recommendation.potentialGain}</p>
          </div>
          <Link to={recommendation.href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Button className="h-11 rounded-xl bg-white px-5 font-bold text-slate-950 hover:bg-slate-200">
              {recommendation.ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
