import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DraftStatus, RecordingCaseRow, RecordingStage } from "../types";

const STAGE_LABELS: Record<RecordingStage, string> = {
  capture: "Capture",
  context: "Add context",
  review: "Review",
  save: "Save",
};

type RecordingHeaderProps = {
  stage: RecordingStage;
  selectedCase?: RecordingCaseRow;
  draftStatus: DraftStatus;
  onClose: () => void;
};

export const RecordingHeader = ({ stage, selectedCase, draftStatus, onClose }: RecordingHeaderProps) => (
  <header className="flex flex-col gap-4 rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div>
      <button
        type="button"
        onClick={onClose}
        className="mb-4 inline-flex items-center text-xs font-bold uppercase tracking-[0.14em] text-slate-600 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      >
        <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        Close capture
      </button>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Proof Live Capture</p>
      <h1 className="mt-2 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">{STAGE_LABELS[stage]}</h1>
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-100">
          <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
          Private workspace
        </span>
        <span className="rounded-full bg-white/[0.04] px-3 py-1 text-slate-400">
          Draft: {draftStatus.replace("-", " ")}
        </span>
        {selectedCase && <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-100">{selectedCase.title}</span>}
      </div>
    </div>

    <Button type="button" variant="outline" onClick={onClose} className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
      Exit
    </Button>
  </header>
);
