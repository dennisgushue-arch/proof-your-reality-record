import { File as FileIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingEvidenceItem } from "../types";
import { PhotoCaptureButton } from "./PhotoCaptureButton";

type EvidenceCaptureTrayProps = {
  items: PendingEvidenceItem[];
  onFiles: (files: File[], source: "camera" | "files") => void;
  onRemove: (id: string) => void;
};

export const EvidenceCaptureTray = ({ items, onFiles, onRemove }: EvidenceCaptureTrayProps) => (
  <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5" aria-labelledby="evidence-tray-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Evidence capture</p>
        <h2 id="evidence-tray-title" className="mt-1 text-xl font-black text-white">Pending evidence</h2>
        <p className="mt-1 text-sm text-slate-500">Files upload after the incident is created and are then associated with the record.</p>
      </div>
      <PhotoCaptureButton onFiles={onFiles} />
    </div>

    {items.length === 0 ? (
      <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
        No evidence selected yet. Photos and files stay pending until save.
      </div>
    ) : (
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-200" aria-hidden="true">
                <FileIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{item.filename}</p>
                <p className="text-xs text-slate-600">{item.type || "file"} · {new Date(item.capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {item.status}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" onClick={() => onRemove(item.id)} aria-label={`Remove ${item.filename}`} className="text-slate-500 hover:text-white">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
