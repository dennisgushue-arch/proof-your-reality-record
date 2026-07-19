import type { AIMessage } from "../types";
import { Composer } from "./Composer";
import { MessageBubble } from "./MessageBubble";

type ConversationPanelProps = {
  messages: AIMessage[];
  prompt: string;
  disabled?: boolean;
  submitting?: boolean;
  selectedCaseTitle?: string | null;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
  onRetry?: () => void;
};

export const ConversationPanel = ({ messages, prompt, disabled = false, submitting = false, selectedCaseTitle, onPromptChange, onSubmit, onRetry }: ConversationPanelProps) => (
  <section className="flex min-h-[640px] flex-col rounded-[2rem] border border-white/[0.06] bg-[#0A1019] p-3 sm:p-4" aria-labelledby="conversation-title">
    <div className="border-b border-white/[0.06] px-2 pb-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Conversation</p>
      <h2 id="conversation-title" className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Ask about this case</h2>
      <p className="mt-1 text-sm text-slate-500">Responses are grounded in the selected case records supported by the current AI endpoint.</p>
    </div>

    <div className="flex-1 space-y-5 overflow-y-auto px-1 py-5" role="log" aria-label="Proof AI conversation" aria-live="polite">
      {messages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-lg font-black text-white">Start with a case-grounded question.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Try a summary, timeline, missing documentation review, or neutral brief request.</p>
        </div>
      ) : messages.map((message) => <MessageBubble key={message.id} message={message} onRetry={message.role === "assistant" && message.status === "error" ? onRetry : undefined} />)}
    </div>

    <Composer value={prompt} disabled={disabled} submitting={submitting} selectedCaseTitle={selectedCaseTitle} onChange={onPromptChange} onSubmit={onSubmit} />
  </section>
);
