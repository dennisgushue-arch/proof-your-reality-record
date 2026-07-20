import type { FirstRunAction } from "../types";

type FirstRecordStepProps = {
  action: FirstRunAction;
};

export const FirstRecordStep = ({ action }: FirstRecordStepProps) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">First action</p>
    <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white">Start with one supported action.</h2>
    <p className="mt-3 text-sm leading-6 text-slate-400">{action.description}</p>
    <p className="mt-5 rounded-2xl border border-blue-300/15 bg-blue-300/[0.06] p-4 text-sm font-bold text-blue-100">
      Next: {action.label}
    </p>
  </div>
);
