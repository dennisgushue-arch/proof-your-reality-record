import { AlertCircle, Bot, UserRound } from "lucide-react";
import { safeMarkdownText } from "../aiWorkspaceUtils";
import type { AIMessage } from "../types";
import { SourceReferenceCard } from "./SourceReferenceCard";

type MessageBubbleProps = {
  message: AIMessage;
  onRetry?: () => void;
};

export const MessageBubble = ({ message, onRetry }: MessageBubbleProps) => {
  const isUser = message.role === "user";

  return (
    <article className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <Avatar icon="ai" />}
      <div className={`max-w-[92%] rounded-3xl border p-4 sm:max-w-[78%] ${isUser ? "border-blue-300/20 bg-blue-500/15" : "border-white/[0.06] bg-[#0B111A]"}`}>
        <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-600">
          <span>{isUser ? "You" : "Proof AI"}</span>
          <time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time>
        </div>

        {isUser ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{message.text}</p>
        ) : (
          <div aria-live={message.status === "loading" ? "polite" : "off"}>
            {message.status === "loading" ? (
              <p className="text-sm text-slate-400">Reviewing the selected case records…</p>
            ) : message.status === "error" ? (
              <div className="text-sm text-rose-100">
                <p className="flex items-center gap-2"><AlertCircle className="h-4 w-4" aria-hidden="true" /> {message.error || message.answer}</p>
                {onRetry && <button type="button" onClick={onRetry} className="mt-3 text-xs font-bold text-blue-200 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Retry</button>}
              </div>
            ) : (
              <div className="space-y-4">
                {message.title && <h3 className="text-lg font-black tracking-[-0.03em] text-white">{message.title}</h3>}
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{safeMarkdownText(message.answer)}</p>
                {message.findings.length > 0 && (
                  <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">AI observations</p>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      {message.findings.map((finding) => <li key={`${finding.label}-${finding.value}`}>• <span className="font-bold text-slate-100">{finding.label}:</span> {finding.value}</li>)}
                    </ul>
                  </div>
                )}
                {message.sources.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{message.sourceMode === "sources-cited" ? "Sources cited" : "Records considered"}</p>
                    <div className="grid gap-2 sm:grid-cols-2">{message.sources.map((source) => <SourceReferenceCard key={`${source.incidentId}-${source.evidenceId ?? "incident"}`} source={source} />)}</div>
                  </div>
                )}
                <p className="border-t border-white/[0.06] pt-3 text-xs leading-5 text-slate-600">AI output may contain errors. Review against original records. Proof does not provide legal advice.</p>
              </div>
            )}
          </div>
        )}
      </div>
      {isUser && <Avatar icon="user" />}
    </article>
  );
};

const Avatar = ({ icon }: { icon: "ai" | "user" }) => (
  <span className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${icon === "ai" ? "bg-blue-500/12 text-blue-300" : "bg-white/[0.06] text-slate-300"}`}>
    {icon === "ai" ? <Bot className="h-4 w-4" aria-hidden="true" /> : <UserRound className="h-4 w-4" aria-hidden="true" />}
  </span>
);
