import { Link } from "react-router-dom";
import { AlertCircle, FilePlus2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

type CaseDetailEmptyStateProps = {
  caseId?: string;
  variant: "no-incidents" | "no-evidence" | "failed-query";
  message?: string;
};

const COPY = {
  "no-incidents": {
    eyebrow: "No incidents documented",
    title: "Start this case timeline",
    description: "Record the first incident to begin building an organized, reviewable case workspace.",
    icon: FilePlus2,
  },
  "no-evidence": {
    eyebrow: "No evidence attached",
    title: "Add evidence through an incident",
    description: "Evidence uploads are supported in the incident recording flow. Add files when creating the next incident.",
    icon: Paperclip,
  },
  "failed-query": {
    eyebrow: "Unable to load case",
    title: "This workspace could not be loaded",
    description: "Please try again. If this continues, verify the case still exists and your session is active.",
    icon: AlertCircle,
  },
} as const;

export const CaseDetailEmptyState = ({ caseId, variant, message }: CaseDetailEmptyStateProps) => {
  const copy = COPY[variant];
  const Icon = copy.icon;

  return (
    <section className="rounded-[28px] border border-dashed border-white/10 bg-[#0B111A] p-8 text-center" aria-labelledby={`case-empty-${variant}`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-200" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{copy.eyebrow}</p>
      <h2 id={`case-empty-${variant}`} className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">
        {copy.title}
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{message || copy.description}</p>

      {caseId && variant !== "failed-query" && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={`/cases/${caseId}/incidents/new`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <Button className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
              <FilePlus2 className="mr-2 h-4 w-4" aria-hidden="true" />
              Record incident
            </Button>
          </Link>
          <Link to={`/cases/${caseId}/incidents/new`} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
            <Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
              <Paperclip className="mr-2 h-4 w-4" aria-hidden="true" />
              Add evidence
            </Button>
          </Link>
        </div>
      )}
    </section>
  );
};
