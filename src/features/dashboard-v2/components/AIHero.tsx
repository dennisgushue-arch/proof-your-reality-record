import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EvidenceRing } from "./EvidenceRing";

type AIHeroProps = {
  loading: boolean;
  status: string;
  findings: string[];
  completionScore: number;
  incidentCount: number;
  statusTone: "Strong" | "Developing" | "Needs attention";
  aiBriefHref?: string;
  replayHref?: string;
  replayLabel: string;
};

export const AIHero = ({
  loading,
  status,
  findings,
  completionScore,
  incidentCount,
  statusTone,
  aiBriefHref,
  replayHref,
  replayLabel,
}: AIHeroProps) => {
  return (
    <section className="rounded-[32px] bg-[#0D1420] p-6 shadow-[0_28px_100px_-52px_rgba(59,130,246,0.7)] sm:p-8 lg:p-10">
      <div className="grid gap-8 xl:grid-cols-[1.5fr_0.8fr] xl:items-center">
        <div>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/20">
              <BrainCircuit className="h-5 w-5 text-blue-300" />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Proof AI</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Live case analysis</p>
            </div>
          </div>

          {loading ? (
            <p className="py-10 text-sm text-slate-500">Analyzing records…</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-300">
                  {statusTone}
                </span>
                <span className="text-xs text-slate-600">
                  {incidentCount} active {incidentCount === 1 ? "incident" : "incidents"}
                </span>
              </div>

              <h2 className="max-w-3xl text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl">{status}</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {findings.slice(0, 4).map((finding) => (
                  <div key={finding} className="flex gap-3 rounded-2xl bg-white/[0.03] p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                    <span className="text-sm leading-relaxed text-slate-300">{finding}</span>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                {aiBriefHref && (
                  <Link to={aiBriefHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    <Button className="h-11 rounded-xl bg-blue-500 px-5 font-bold hover:bg-blue-400">
                      Open AI brief
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}

                {replayHref && (
                  <Link to={replayHref} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-white/10 bg-white/[0.02] px-5 font-bold hover:bg-white/[0.06]"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {replayLabel}
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </div>

        <EvidenceRing score={completionScore} incidentCount={incidentCount} />
      </div>
    </section>
  );
};
