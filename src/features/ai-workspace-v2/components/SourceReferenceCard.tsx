import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { formatDate } from "../aiWorkspaceUtils";
import type { AIWorkspaceSource } from "../types";

type SourceReferenceCardProps = {
  source: AIWorkspaceSource;
};

export const SourceReferenceCard = ({ source }: SourceReferenceCardProps) => (
  <Link to={source.href} className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm transition hover:border-blue-300/20 hover:bg-blue-300/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-bold text-slate-100">{source.incidentTitle}</p>
        <p className="mt-1 text-xs text-slate-500">{formatDate(source.occurredAt)}</p>
        {(source.evidenceFilename || source.evidenceType) && (
          <p className="mt-2 flex items-center gap-1.5 truncate text-xs text-slate-400"><FileText className="h-3.5 w-3.5" aria-hidden="true" /> {source.evidenceFilename || source.evidenceType}</p>
        )}
        {source.excerpt && <p className="mt-2 line-clamp-2 text-xs text-slate-500">“{source.excerpt}”</p>}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-blue-300" aria-hidden="true" />
    </div>
  </Link>
);
