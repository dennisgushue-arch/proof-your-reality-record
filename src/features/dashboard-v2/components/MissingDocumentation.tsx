import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IncidentCompletion } from "@/lib/evidenceCompletion";

type MissingDocumentationProps = {
  next: IncidentCompletion;
};

export const MissingDocumentation = ({ next }: MissingDocumentationProps) => {
  return (
    <section className="mt-8 rounded-[26px] bg-[#0B111A] p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Missing documentation</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.035em] text-white">Strengthen “{next.title}”</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Proof flagged incomplete fields that may reduce the usefulness of this incident later.
          </p>
        </div>

        <div className="rounded-2xl bg-white/[0.03] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {next.missing.slice(0, 4).map((item) => (
              <div key={item.label} className="flex items-center gap-3 rounded-xl bg-black/15 p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                </span>
                <span className="text-sm font-medium text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>

          <Link
            to={`/incidents/${next.incidentId}`}
            className="mt-4 inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
              Fix missing details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
