import { AlertTriangle, Check, FileText, ShieldCheck } from "lucide-react";
import type { ElementType } from "react";

type IntelligenceMetricsProps = {
  evidenceStrength: number;
  contradictionCount: number;
  evidenceCount: number;
};

const MetricCard = ({
  label,
  value,
  detail,
  warning,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  warning?: boolean;
  icon: ElementType;
}) => {
  const Icon = icon;

  return (
    <div className="rounded-[22px] bg-[#0B111A] p-5">
      <div className="flex items-center justify-between">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            warning ? "bg-amber-400/10 text-amber-300" : "bg-blue-500/10 text-blue-300"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        {warning ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : <Check className="h-4 w-4 text-emerald-300" />}
      </div>
      <p className="mt-5 text-3xl font-black tracking-[-0.045em] text-white">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-300">{label}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
};

export const IntelligenceMetrics = ({
  evidenceStrength,
  contradictionCount,
  evidenceCount,
}: IntelligenceMetricsProps) => {
  return (
    <section className="mt-8 grid gap-4 sm:grid-cols-3">
      <MetricCard
        icon={ShieldCheck}
        label="Evidence strength"
        value={`${evidenceStrength}%`}
        detail="Across all active records"
      />
      <MetricCard
        icon={AlertTriangle}
        label="Possible statement differences"
        value={String(contradictionCount)}
        detail={contradictionCount === 0 ? "No differences currently flagged" : "Possible differences flagged for review"}
        warning={contradictionCount > 0}
      />
      <MetricCard
        icon={FileText}
        label="Evidence items"
        value={String(evidenceCount)}
        detail="Files attached to incidents"
      />
    </section>
  );
};
