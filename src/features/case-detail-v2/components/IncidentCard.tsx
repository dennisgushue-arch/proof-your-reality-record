import { Link } from "react-router-dom";
import { AlertTriangle, Bot, Edit3, FileText, MapPin, Paperclip, Tag, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIncidentDate, getAISummaryStatus, getEvidenceTone, getEvidenceToneClasses, getIncidentCompleteness, getMissingFieldLabels, normalizeStringArray } from "../caseDetailUtils";
import type { CaseDetailIncidentRow } from "../types";

type IncidentCardProps = {
  incident: CaseDetailIncidentRow;
  caseCategory: string;
};

export const IncidentCard = ({ incident, caseCategory }: IncidentCardProps) => {
  const people = normalizeStringArray(incident.people_involved);
  const tags = normalizeStringArray(incident.tags);
  const score = incident.evidence_quality_score ?? getIncidentCompleteness(incident);
  const tone = getEvidenceTone(score);
  const evidenceCount = incident.evidence_items?.length ?? 0;
  const completeness = getIncidentCompleteness(incident);
  const missingFields = getMissingFieldLabels(incident);
  const incomplete = missingFields.length > 0;

  return (
    <article
      className={[
        "rounded-2xl border p-5 transition-all hover:border-blue-400/30 hover:bg-[#0D1420] hover:shadow-[0_20px_70px_-48px_rgba(59,130,246,0.8)]",
        incomplete ? "border-amber-400/25 bg-amber-400/[0.055]" : "border-white/[0.06] bg-[#0B111A]",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-mono text-slate-600">{formatIncidentDate(incident.occurred_at)}</p>
          <h3 className="mt-2 text-lg font-black tracking-[-0.02em] text-white">{incident.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {caseCategory}
            </span>
            {incomplete && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-200">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Incomplete record
              </span>
            )}
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${getEvidenceToneClasses(tone)}`}>
          Score {score}
        </span>
      </div>

      {(incident.neutral_summary || incident.raw_narrative) && (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{incident.neutral_summary || incident.raw_narrative}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {incident.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {incident.location}
          </span>
        )}
        {people.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {people.join(", ")}
          </span>
        )}
        {tags.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            {tags.join(", ")}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip icon={Paperclip} label={`${evidenceCount} evidence ${evidenceCount === 1 ? "item" : "items"}`} />
        <Chip icon={FileText} label={`${completeness}% complete`} />
        <Chip icon={Bot} label={getAISummaryStatus(incident)} />
      </div>

      {missingFields.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-400/15 bg-black/15 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">Missing fields flagged for review</p>
          <p className="mt-1 text-sm leading-6 text-slate-400">{missingFields.join(", ")}</p>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <Link to={`/incidents/${incident.id}`}>
          <Button variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
            <Edit3 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Open / Edit
          </Button>
        </Link>
      </div>
    </article>
  );
};

const Chip = ({ icon: Icon, label }: { icon: typeof Paperclip; label: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-slate-400">
    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    {label}
  </span>
);
