import { Link } from "react-router-dom";
import { BrainCircuit, Eraser, Lock, MessageSquarePlus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AIWorkspaceCaseRow, WorkspaceStatus } from "../types";

type AIWorkspaceHeaderProps = {
  selectedCase: AIWorkspaceCaseRow | null;
  status: WorkspaceStatus;
  recordCount: number;
  evidenceCount: number;
  onNewConversation: () => void;
  onClearContext: () => void;
};

export const AIWorkspaceHeader = ({ selectedCase, status, recordCount, evidenceCount, onNewConversation, onClearContext }: AIWorkspaceHeaderProps) => {
  const statusLabel = status === "ready" ? "Context loaded" : status === "loading" ? "Loading context" : status === "error" ? "Needs attention" : "Awaiting case";

  return (
    <header className="rounded-[2rem] border border-white/[0.06] bg-[#0B111A]/92 p-5 shadow-[0_24px_80px_-48px_rgba(59,130,246,0.9)] sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
            <BrainCircuit className="h-4 w-4" aria-hidden="true" /> Proof AI
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white sm:text-5xl">Intelligence Workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Case-grounded analysis, conversation, and structured review based only on records loaded for the selected case.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Selected case</div>
            <div className="mt-1 truncate text-sm font-bold text-slate-100">{selectedCase?.title ?? "No case selected"}</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/10 bg-cyan-300/[0.04] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {statusLabel}
            </div>
            <div className="mt-1 text-xs text-slate-500">{recordCount} records · {evidenceCount} evidence items</div>
          </div>
          <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-3 sm:col-span-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Private workspace
            </div>
            <div className="mt-1 text-xs text-slate-500">Proof organizes information supplied by the user. Review AI output against original records.</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onNewConversation} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
          <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden="true" /> New conversation
        </Button>
        <Button type="button" variant="outline" onClick={onClearContext} className="rounded-xl border-white/10 bg-white/[0.02] text-slate-200">
          <Eraser className="mr-2 h-4 w-4" aria-hidden="true" /> Clear context
        </Button>
        {selectedCase && (
          <Button asChild type="button" variant="ghost" className="rounded-xl text-slate-400 hover:text-white">
            <Link to={`/cases/${selectedCase.id}`}>Open case</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
