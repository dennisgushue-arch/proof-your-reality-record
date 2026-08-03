import { ArrowRight, Check, Clock3, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type OnboardingCompletionCardProps = {
  timelineHref: string;
  exportHref: string;
  onDismiss: () => void;
};

export const OnboardingCompletionCard = ({ timelineHref, exportHref, onDismiss }: OnboardingCompletionCardProps) => (
  <section className="rounded-[28px] border border-emerald-300/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(11,17,26,0.98)_52%)] p-6 shadow-[0_24px_70px_-52px_rgba(52,211,153,0.75)] sm:p-8" aria-labelledby="onboarding-complete-title">
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400 text-emerald-950">
      <Check className="h-6 w-6" strokeWidth={3} aria-hidden="true" />
    </div>
    <h2 id="onboarding-complete-title" className="mt-5 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">
      Your first Proof record is complete.
    </h2>
    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
      You now have an organized timeline, connected entities, and AI-generated insights.
    </p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Button asChild className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
        <Link to={timelineHref}><Clock3 className="mr-2 h-4 w-4" aria-hidden="true" />View Timeline<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
      </Button>
      <Button asChild variant="outline" className="rounded-xl border-white/10 bg-white/[0.03] font-bold hover:bg-white/[0.07]">
        <Link to={exportHref}><Download className="mr-2 h-4 w-4" aria-hidden="true" />Export Record</Link>
      </Button>
      <Button type="button" variant="ghost" onClick={onDismiss} className="rounded-xl font-bold text-slate-400 hover:text-white">
        Dismiss
      </Button>
    </div>
  </section>
);