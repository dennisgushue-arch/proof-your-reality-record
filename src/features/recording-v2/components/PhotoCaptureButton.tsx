import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type PhotoCaptureButtonProps = {
  onFiles: (files: File[], source: "camera" | "files") => void;
};

export const PhotoCaptureButton = ({ onFiles }: PhotoCaptureButtonProps) => {
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" onClick={() => cameraRef.current?.click()} className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
        <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
        Take photo
      </Button>
      <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06]">
        <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
        Attach files
      </Button>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => onFiles(Array.from(event.target.files ?? []), "camera")} />
      <input ref={fileRef} type="file" multiple className="hidden" onChange={(event) => onFiles(Array.from(event.target.files ?? []), "files")} />
    </div>
  );
};
