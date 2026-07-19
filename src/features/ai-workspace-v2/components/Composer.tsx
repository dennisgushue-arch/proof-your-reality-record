import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ComposerProps = {
  value: string;
  disabled?: boolean;
  submitting?: boolean;
  selectedCaseTitle?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export const Composer = ({ value, disabled = false, submitting = false, selectedCaseTitle, onChange, onSubmit }: ComposerProps) => {
  const canSubmit = value.trim().length > 0 && !disabled && !submitting;

  return (
    <form
      className="sticky bottom-3 z-20 rounded-3xl border border-white/[0.08] bg-[#080d15]/95 p-3 shadow-[0_20px_60px_-34px_rgba(59,130,246,0.9)] backdrop-blur"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <label htmlFor="proof-ai-composer" className="sr-only">Ask Proof AI about the selected case</label>
      <div className="mb-2 flex items-center justify-between gap-3 px-1 text-[11px] text-slate-600">
        <span>{selectedCaseTitle ? `Grounded in: ${selectedCaseTitle}` : "Select a case to ground Proof AI"}</span>
        <span>Press Ctrl+Enter or ⌘+Enter to send</span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Textarea
          id="proof-ai-composer"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && canSubmit) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={3}
          maxLength={4000}
          disabled={disabled || submitting}
          placeholder="Ask for a neutral summary, timeline, missing documentation, or records to review next…"
          className="min-h-[92px] resize-none rounded-2xl border-white/10 bg-[#0B111A] text-sm text-slate-100 placeholder:text-slate-600 focus-visible:ring-blue-300"
        />
        <Button type="submit" disabled={!canSubmit} className="h-12 rounded-2xl bg-blue-500 px-5 font-black hover:bg-blue-400">
          <Send className="mr-2 h-4 w-4" aria-hidden="true" /> {submitting ? "Reviewing…" : "Send"}
        </Button>
      </div>
    </form>
  );
};
