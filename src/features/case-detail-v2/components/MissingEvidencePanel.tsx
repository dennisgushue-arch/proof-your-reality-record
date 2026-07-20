import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MissingEvidenceItem } from "../types";

type MissingEvidencePanelProps = {
  items: MissingEvidenceItem[];
};

export const MissingEvidencePanel = ({ items }: MissingEvidencePanelProps) => {
  const visible = items.slice(0, 5);

  return (
    <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Missing evidence</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Highest-impact gaps</h2>
        </div>
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {items.length} open
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-emerald-400/10 p-5 text-emerald-100">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" />
            <p className="text-sm font-bold">No major documentation gaps detected.</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-100/70">Keep reviewing new incidents as the case grows.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <article key={item.id} className="rounded-2xl bg-white/[0.03] p-4">
              <div className="flex gap-3">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.severity === "high" ? "bg-rose-400/10 text-rose-200" : item.severity === "medium" ? "bg-amber-400/10 text-amber-200" : "bg-blue-400/10 text-blue-200"}`}>
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-white">{item.label}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-600">{item.incidentTitle}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
                  <Link to={`/incidents/${item.incidentId}`} className="mt-3 inline-flex">
                    <Button variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
                      Fix gap
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
