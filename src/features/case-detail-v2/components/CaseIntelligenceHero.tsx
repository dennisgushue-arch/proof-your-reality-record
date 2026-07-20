import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, CheckCircle2, FileText, Layers3, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryColor } from "@/lib/categories";
import type { CaseIntelligence } from "@/lib/caseIntelligence";
import { getEvidenceTone, getEvidenceToneClasses } from "../caseDetailUtils";
import type { CaseDetailCaseRow, CaseDetailSummary } from "../types";

type CaseIntelligenceHeroProps = {
  caseId: string;
  caseRow: CaseDetailCaseRow;
  intelligence: CaseIntelligence;
  summary: CaseDetailSummary;
};

export const CaseIntelligenceHero = ({ caseId, caseRow, intelligence, summary }: CaseIntelligenceHeroProps) => {
  const tone = getEvidenceTone(intelligence.evidenceStrength);

  return (
    <section className="rounded-[32px] bg-[#0D1420] p-6 shadow-[0_28px_100px_-52px_rgba(59,130,246,0.7)] sm:p-8">
      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/20">
            <BrainCircuit className="h-5 w-5 text-blue-300" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Proof AI case intelligence</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Last updated {summary.lastActivityLabel}</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">{caseRow.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`inline-block rounded-lg border px-2.5 py-1 text-xs font-bold ${categoryColor(caseRow.category)}`}>
                {caseRow.category}
              </span>
              <span className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-100">
                {summary.caseStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-500/10 p-5 text-center lg:min-w-44">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/70">Evidence completion</p>
          <p className="mt-2 text-4xl font-black text-white">{summary.completionPercentage}%</p>
          <p className="mt-1 text-xs text-blue-100/60">{intelligence.evidenceStrength}% strength</p>
          <div
            className="sr-only"
            role="progressbar"
            aria-label="Evidence completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.completionPercentage}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getEvidenceToneClasses(tone)}`}>
          {intelligence.strengthLabel}
        </span>
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
          {intelligence.confidence} confidence
        </span>
      </div>

      <p className="max-w-4xl text-xl font-black tracking-[-0.035em] text-white sm:text-2xl">{intelligence.status}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <HeroMetric icon={FileText} label="Incidents" value={summary.incidentCount.toString()} />
        <HeroMetric icon={Layers3} label="Evidence items" value={summary.evidenceCount.toString()} />
        <HeroMetric icon={ShieldCheck} label="Timeline gaps" value={intelligence.timelineGapCount.toString()} />
        <HeroMetric icon={Sparkles} label="Statement differences" value={intelligence.contradictionCount.toString()} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {intelligence.findings.slice(0, 4).map((finding) => (
          <div key={finding} className="flex gap-3 rounded-2xl bg-white/[0.03] p-4">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
            <span className="text-sm leading-relaxed text-slate-300">{finding}</span>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-2xl border border-white/[0.06] bg-black/15 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">Recommended action</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{intelligence.recommendedAction}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link to={`/cases/${caseId}/intelligence`}>
              <Button className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
                Open brief
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to={`/cases/${caseId}/replay`}>
              <Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
                <PlayCircle className="mr-2 h-4 w-4" />
                Replay
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroMetric = ({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-200">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
        <p className="mt-1 text-xl font-black text-white">{value}</p>
      </div>
    </div>
  </div>
);
