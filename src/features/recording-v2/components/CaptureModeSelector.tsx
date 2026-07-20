import { Camera, Keyboard, MapPin, Mic } from "lucide-react";
import type { CaptureMode } from "../types";

const MODES: Array<{ value: CaptureMode; label: string; description: string; icon: typeof Mic }> = [
  { value: "speak", label: "Speak", description: "Voice dictation", icon: Mic },
  { value: "type", label: "Type", description: "Manual notes", icon: Keyboard },
  { value: "photo", label: "Photo", description: "Camera/files", icon: Camera },
  { value: "location", label: "Location", description: "Manual or GPS", icon: MapPin },
];

type CaptureModeSelectorProps = {
  mode: CaptureMode;
  onChange: (mode: CaptureMode) => void;
};

export const CaptureModeSelector = ({ mode, onChange }: CaptureModeSelectorProps) => (
  <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Capture mode">
    {MODES.map((item) => {
      const Icon = item.icon;
      const active = mode === item.value;
      return (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          aria-pressed={active}
          className={[
            "rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
            active ? "border-blue-400/30 bg-blue-500/15 text-white" : "border-white/[0.06] bg-[#0B111A] text-slate-400 hover:bg-white/[0.04]",
          ].join(" ")}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <div className="mt-3 text-sm font-black">{item.label}</div>
          <div className="mt-1 text-xs text-slate-500">{item.description}</div>
        </button>
      );
    })}
  </section>
);
