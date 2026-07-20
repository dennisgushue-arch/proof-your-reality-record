import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecommendedCaseActionModel } from "../types";

type RecommendedCaseActionProps = {
  action: RecommendedCaseActionModel;
};

export const RecommendedCaseAction = ({ action }: RecommendedCaseActionProps) => {
  return (
    <section className="rounded-[28px] border border-blue-400/15 bg-[#0D1420] p-5 shadow-[0_24px_80px_-56px_rgba(59,130,246,0.65)] sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200" aria-hidden="true">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Recommended next action</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">{action.title}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{action.description}</p>
          </div>
        </div>

        <Link to={action.href} className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050812]">
          <Button className="h-11 rounded-xl bg-blue-500 px-5 font-bold text-white hover:bg-blue-400">
            {action.ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </section>
  );
};
