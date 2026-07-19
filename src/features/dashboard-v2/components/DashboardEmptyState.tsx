import { Link } from "react-router-dom";
import { ArrowRight, Mic, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardEmptyStateProps = {
  recordHref: string;
  createCaseHref?: string;
};

export const DashboardEmptyState = ({ recordHref, createCaseHref }: DashboardEmptyStateProps) => {
  return (
    <section className="rounded-[32px] bg-[#0D1420] p-6 sm:p-8 lg:p-10">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
        <Sparkles className="h-3.5 w-3.5" />
        New workspace
      </div>

      <h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">
        Your first Reality Record starts here.
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400">
        Capture what happened, add supporting evidence, and let Proof organize your timeline into review-ready history.
      </p>

      <ol className="mt-8 grid gap-3 sm:grid-cols-3">
        <li className="rounded-2xl bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Step 1</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">Record an incident</p>
        </li>
        <li className="rounded-2xl bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Step 2</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">Add evidence</p>
        </li>
        <li className="rounded-2xl bg-white/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">Step 3</p>
          <p className="mt-1 text-sm font-semibold text-slate-200">Proof organizes your timeline</p>
        </li>
      </ol>

      <div className="mt-7 flex flex-wrap gap-3">
        <Link to={recordHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
          <Button className="h-12 rounded-xl bg-blue-500 px-6 font-bold hover:bg-blue-400">
            <Mic className="mr-2 h-4 w-4" />
            Start recording
          </Button>
        </Link>

        {createCaseHref && (
          <Link to={createCaseHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-white/[0.02] px-6 font-bold hover:bg-white/[0.06]">
              <Plus className="mr-2 h-4 w-4" />
              Create case
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
};
