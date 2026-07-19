import type { SuggestedPrompt } from "../types";

type SuggestedPromptsProps = {
  prompts: SuggestedPrompt[];
  disabled?: boolean;
  onSelectPrompt: (prompt: string) => void;
};

export const SuggestedPrompts = ({ prompts, disabled = false, onSelectPrompt }: SuggestedPromptsProps) => (
  <section aria-labelledby="suggested-prompts-title" className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-4">
    <h2 id="suggested-prompts-title" className="text-sm font-black uppercase tracking-[0.16em] text-slate-400">Suggested prompts</h2>
    <div className="mt-3 flex flex-wrap gap-2">
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelectPrompt(prompt.prompt)}
          className="rounded-full border border-blue-300/15 bg-blue-300/[0.06] px-3 py-2 text-left text-xs font-bold text-blue-100 transition hover:border-blue-300/30 hover:bg-blue-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {prompt.label}
        </button>
      ))}
    </div>
  </section>
);
