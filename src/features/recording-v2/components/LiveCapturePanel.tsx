import { Textarea } from "@/components/ui/textarea";
import type { ReactNode } from "react";
import type { CaptureMode, TranscriptEvent } from "../types";
import { LiveTranscript } from "./LiveTranscript";
import { LocationCapture } from "./LocationCapture";
import { RecordingControls } from "./RecordingControls";

type LiveCapturePanelProps = {
  mode: CaptureMode;
  narrative: string;
  transcriptEvents: TranscriptEvent[];
  isDictating: boolean;
  isSupported: boolean;
  elapsedLabel: string;
  dictationError?: string | null;
  location: string;
  locationError?: string | null;
  locationLoading: boolean;
  evidenceTray: ReactNode;
  onNarrativeChange: (value: string) => void;
  onToggleDictation: () => void;
  onRetryDictation: () => void;
  onEditTranscriptEvent: (id: string, text: string) => void;
  onCaptureLocation: () => void;
  onLocationChange: (value: string) => void;
};

export const LiveCapturePanel = ({
  mode,
  narrative,
  transcriptEvents,
  isDictating,
  isSupported,
  elapsedLabel,
  dictationError,
  location,
  locationError,
  locationLoading,
  evidenceTray,
  onNarrativeChange,
  onToggleDictation,
  onRetryDictation,
  onEditTranscriptEvent,
  onCaptureLocation,
  onLocationChange,
}: LiveCapturePanelProps) => (
  <section className="rounded-[32px] bg-[#0D1420] p-5 shadow-[0_28px_100px_-52px_rgba(59,130,246,0.7)] sm:p-7" aria-labelledby="live-capture-title">
    <div className="mb-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Live evidence capture</p>
      <h2 id="live-capture-title" className="mt-2 text-3xl font-black tracking-[-0.045em] text-white">Capture what happened</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Start with voice, typed notes, a photo, or location. You can add context after capture.</p>
    </div>

    {mode === "speak" && (
      <div className="space-y-6">
        <RecordingControls
          isDictating={isDictating}
          isSupported={isSupported}
          elapsedLabel={elapsedLabel}
          onToggle={onToggleDictation}
          onRetry={onRetryDictation}
          errorMessage={dictationError}
        />
        <LiveTranscript events={transcriptEvents} onEditEvent={onEditTranscriptEvent} />
      </div>
    )}

    {mode === "type" && (
      <div>
        <label htmlFor="recording-narrative" className="text-sm font-bold text-white">Type notes</label>
        <Textarea
          id="recording-narrative"
          value={narrative}
          onChange={(event) => onNarrativeChange(event.target.value)}
          rows={10}
          placeholder="What happened? When did it happen? Where did it happen? Who was involved? What was said or done? What evidence exists?"
          className="mt-3 min-h-64 rounded-2xl border-white/10 bg-[#050812] text-base leading-7"
        />
        <p className="mt-2 text-xs text-slate-600">{narrative.length} characters captured</p>
      </div>
    )}

    {mode === "photo" && <div>{evidenceTray}</div>}

    {mode === "location" && (
      <LocationCapture
        location={location}
        loading={locationLoading}
        errorMessage={locationError}
        onCapture={onCaptureLocation}
        onChange={onLocationChange}
      />
    )}
  </section>
);
