import type { DocumentationStrength as DocumentationStrengthModel } from "../types";

type DocumentationStrengthProps = {
  strength: DocumentationStrengthModel;
};

export const DocumentationStrength = ({ strength }: DocumentationStrengthProps) => (
  <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5" aria-labelledby="strength-title">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Documentation strength</p>
    <div className="mt-2 flex items-end justify-between gap-4">
      <h2 id="strength-title" className="text-2xl font-black tracking-[-0.035em] text-white">{strength.label}</h2>
      <span className="text-3xl font-black text-blue-300">{strength.score}%</span>
    </div>
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-label="Documentation strength" aria-valuemin={0} aria-valuemax={100} aria-valuenow={strength.score}>
      <div className="h-full rounded-full bg-blue-400" style={{ width: `${strength.score}%` }} />
    </div>
    {strength.missing.length > 0 ? (
      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Missing details</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {strength.missing.map((item) => <span key={item} className="rounded-full bg-white/[0.04] px-3 py-1 text-xs font-bold text-slate-400">{item}</span>)}
        </div>
      </div>
    ) : <p className="mt-4 text-sm text-slate-500">Ready to review. Additional context can still be added if useful.</p>}
  </section>
);
