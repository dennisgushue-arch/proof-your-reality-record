import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActivationChecklist, type ActivationStep } from "./ActivationChecklist";

type DashboardEmptyStateProps = {
  createCaseHref: string;
  steps: ActivationStep[];
  onSkip: () => void;
};

export const DashboardEmptyState = ({ createCaseHref, steps, onSkip }: DashboardEmptyStateProps) => {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-blue-300/15 bg-[linear-gradient(145deg,rgba(59,130,246,0.11),rgba(13,20,32,0.98)_48%)] p-6 shadow-[0_30px_90px_-60px_rgba(59,130,246,0.95)] sm:p-8 lg:p-10" aria-labelledby="welcome-to-proof">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Guided setup
        </div>
        <h2 id="welcome-to-proof" className="text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">Welcome to Proof</h2>
        <p className="mt-3 text-lg font-semibold text-blue-100">Let&apos;s build your first organized record.</p>
        <p className="mt-5 text-sm text-slate-400">In just a few minutes you&apos;ll:</p>
        <ul className="mt-4 space-y-3">
          {["Create your first case", "Record your first incident", "Add evidence", "Generate an AI summary", "Build your first entity map"].map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-semibold text-slate-200">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Check className="h-3.5 w-3.5" aria-hidden="true" /></span>
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild className="h-12 rounded-xl bg-blue-500 px-6 font-bold hover:bg-blue-400">
            <Link to={createCaseHref}>Create My First Case<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
          </Button>
          <Button type="button" variant="ghost" onClick={onSkip} className="h-12 rounded-xl px-5 font-bold text-slate-400 hover:text-white">Skip for now</Button>
        </div>
      </section>
      <ActivationChecklist steps={steps} />
    </div>
  );
};
