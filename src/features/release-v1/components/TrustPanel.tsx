import { ShieldCheck } from "lucide-react";
import { TRUST_COPY } from "../releaseUtils";

type TrustPanelProps = {
  compact?: boolean;
};

export const TrustPanel = ({ compact = false }: TrustPanelProps) => (
  <section className={`rounded-2xl border border-white/[0.07] bg-white/[0.03] ${compact ? "p-4" : "p-5"}`} aria-labelledby="trust-panel-title">
    <div className="flex items-center gap-2 text-sm font-bold text-blue-200">
      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
      <h2 id="trust-panel-title">Trust and review</h2>
    </div>
    <ul className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
      <li>{TRUST_COPY.privateByDesign}</li>
      <li>{TRUST_COPY.aiReview}</li>
      <li>{TRUST_COPY.noLegalAdvice}</li>
    </ul>
  </section>
);
