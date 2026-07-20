import { Link } from "react-router-dom";
import { Download, FilePlus2, FileText, Paperclip, PlayCircle, Radio, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type CaseActionsProps = {
  caseId: string;
  activeLiveSessionId?: string | null;
  recommendedIncidentId?: string | null;
};

export const CaseActions = ({ caseId, activeLiveSessionId, recommendedIncidentId }: CaseActionsProps) => {
  const liveSessionHref = activeLiveSessionId
    ? `/cases/${caseId}/incidents/new?liveSession=${encodeURIComponent(activeLiveSessionId)}`
    : undefined;

  return (
    <aside className="h-fit rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6 xl:sticky xl:top-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Case actions</p>
      <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Next moves</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Jump into the workflows most often used while reviewing a case.</p>

      <div className="mt-5 space-y-3">
        <ActionLink href={`/cases/${caseId}/incidents/new`} icon={FilePlus2} label="Record Incident" primary />
        <ActionLink href={`/cases/${caseId}/incidents/new`} icon={Paperclip} label="Add Evidence" />
        {liveSessionHref && <ActionLink href={liveSessionHref} icon={Radio} label="Create from live session" />}
        {recommendedIncidentId && <ActionLink href={`/incidents/${recommendedIncidentId}`} icon={FileText} label="Review recommended incident" />}
        <ActionLink href={`/cases/${caseId}/intelligence`} icon={Sparkles} label="Generate AI Brief" />
        <ActionLink href={`/cases/${caseId}/replay`} icon={PlayCircle} label="Open Reality Replay" />
        <ActionLink href={`/cases/${caseId}/export`} icon={Download} label="Export Case" />
      </div>
    </aside>
  );
};

const ActionLink = ({ href, icon: Icon, label, primary = false }: { href: string; icon: typeof FilePlus2; label: string; primary?: boolean }) => (
  <Link to={href} className="block">
    <Button
      variant={primary ? "default" : "outline"}
      className={
        primary
          ? "h-11 w-full justify-start rounded-xl bg-blue-500 font-bold hover:bg-blue-400"
          : "h-11 w-full justify-start rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]"
      }
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  </Link>
);
