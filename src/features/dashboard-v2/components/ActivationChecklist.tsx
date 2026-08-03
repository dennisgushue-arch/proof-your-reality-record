import { Check, Circle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export type ActivationStep = {
  id: string;
  label: string;
  description: string;
  complete: boolean;
  href: string;
  actionLabel: string;
};

export const ActivationChecklist = ({ steps }: { steps: ActivationStep[] }) => {
  const completed = steps.filter((step) => step.complete).length;
  const next = steps.find((step) => !step.complete);
  const percentage = Math.round((completed / steps.length) * 100);
  const guidance =
    completed === 0
      ? "Create your first case to give your record an organized home."
      : completed === 1
        ? "Great! Now add your first incident."
        : completed === 2
          ? "Nice work. Add a photo, message, or document."
          : completed === 3
            ? "Run AI Analysis to organize your timeline."
            : "Now analyze relationships between people and evidence.";

  return (
    <section className="rounded-[28px] border border-blue-300/15 bg-[#0B111A] p-5 shadow-[0_24px_70px_-55px_rgba(59,130,246,0.9)] sm:p-7" aria-labelledby="activation-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Progress</p>
          <h2 id="activation-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Getting Started</h2>
        </div>
        <p className="text-sm font-bold text-blue-100" aria-live="polite">
          {completed} / {steps.length} Completed
        </p>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <div className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>

      <ol className="mt-5 grid gap-2">
        {steps.map((step) => (
          <li key={step.id} className={`rounded-2xl border p-4 transition-colors duration-300 motion-reduce:transition-none ${step.complete ? "border-emerald-300/20 bg-emerald-300/[0.07]" : step.id === next?.id ? "border-blue-300/25 bg-blue-300/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full transition-transform duration-300 motion-reduce:transition-none ${step.complete ? "scale-100 bg-emerald-400 text-emerald-950" : "bg-white/[0.03] text-slate-600"}`}>
                {step.complete ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-black ${step.complete ? "text-emerald-100" : "text-white"}`}>{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{step.description}</p>
                {step.id === next?.id && (
                  <Link to={step.href} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-200 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
                    {step.actionLabel}<ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {next && (
        <div className="mt-5 rounded-2xl border border-blue-300/15 bg-blue-400/[0.06] px-4 py-3" aria-live="polite">
          <p className="text-sm font-semibold text-blue-100">{guidance}</p>
        </div>
      )}
    </section>
  );
};