import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordingControlsProps = {
  isDictating: boolean;
  isSupported: boolean;
  isAudioFallback?: boolean;
  elapsedLabel: string;
  onToggle: () => void;
  onRetry: () => void;
  errorMessage?: string | null;
};

export const RecordingControls = ({ isDictating, isSupported, isAudioFallback = false, elapsedLabel, onToggle, onRetry, errorMessage }: RecordingControlsProps) => (
  <div className="text-center" aria-live="polite">
    <Button
      type="button"
      onClick={onToggle}
      className={[
        "h-24 w-24 rounded-full text-white shadow-[0_24px_80px_-40px_rgba(59,130,246,0.9)] focus-visible:ring-blue-300",
        isDictating ? "bg-rose-500 hover:bg-rose-400" : "bg-blue-500 hover:bg-blue-400",
      ].join(" ")}
      aria-label={isDictating ? (isAudioFallback ? "Stop voice recording" : "Stop voice dictation") : (isAudioFallback ? "Start voice recording" : "Start voice dictation")}
    >
      {isDictating ? <Square className="h-8 w-8" aria-hidden="true" /> : <Mic className="h-8 w-8" aria-hidden="true" />}
    </Button>
    <p className="mt-4 text-lg font-black text-white">{isDictating ? (isAudioFallback ? "Recording audio…" : "Listening…") : (isAudioFallback ? "Start voice recording" : "Start live dictation")}</p>
    <p className="mt-1 text-sm text-slate-500">{isDictating ? elapsedLabel : isAudioFallback ? "Audio will be attached as evidence; live transcription is unavailable here." : "Speech is transcribed; audio is not stored by this flow."}</p>
    {!isSupported && <p className="mt-3 text-sm text-amber-200">Voice capture is not supported in this browser. You can still use Type mode.</p>}
    {errorMessage && (
      <div className="mx-auto mt-4 max-w-md rounded-2xl bg-amber-400/10 p-4 text-sm text-amber-100">
        <p>{errorMessage}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-3 rounded-xl border-amber-400/20 bg-black/10">
          Retry dictation
        </Button>
      </div>
    )}
  </div>
);
