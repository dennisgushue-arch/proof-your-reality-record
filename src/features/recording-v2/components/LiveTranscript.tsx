import type { TranscriptEvent } from "../types";
import { sortTranscriptEvents } from "../recordingUtils";

type LiveTranscriptProps = {
  events: TranscriptEvent[];
  interimText?: string;
  onEditEvent: (id: string, text: string) => void;
};

export const LiveTranscript = ({ events, interimText, onEditEvent }: LiveTranscriptProps) => {
  const sorted = sortTranscriptEvents(events);

  return (
    <section className="rounded-2xl bg-black/15 p-4" aria-labelledby="live-transcript-title">
      <h3 id="live-transcript-title" className="text-sm font-black text-white">Live transcript</h3>
      {sorted.length === 0 && !interimText ? (
        <p className="mt-3 text-sm text-slate-500">Transcript entries, notes, photo events, and location captures will appear here in timestamp order.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {sorted.map((event) => (
            <li key={event.id} className="rounded-xl bg-white/[0.03] p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                <span>{event.type}</span>
                <time dateTime={event.occurredAt}>{new Date(event.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div>
              <textarea
                value={event.text}
                onChange={(input) => onEditEvent(event.id, input.target.value)}
                className="min-h-16 w-full resize-y rounded-lg border border-white/10 bg-[#050812] p-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                aria-label={`Edit ${event.type} transcript entry`}
              />
            </li>
          ))}
          {interimText && (
            <li className="rounded-xl border border-dashed border-blue-400/20 bg-blue-500/5 p-3 text-sm italic text-blue-100/70">
              {interimText}
            </li>
          )}
        </ol>
      )}
    </section>
  );
};
