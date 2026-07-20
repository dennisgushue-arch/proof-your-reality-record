import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type LocationCaptureProps = {
  location: string;
  loading: boolean;
  errorMessage?: string | null;
  onCapture: () => void;
  onChange: (value: string) => void;
};

export const LocationCapture = ({ location, loading, errorMessage, onCapture, onChange }: LocationCaptureProps) => (
  <section className="rounded-2xl bg-black/15 p-4" aria-labelledby="location-capture-title">
    <h3 id="location-capture-title" className="text-sm font-black text-white">Location</h3>
    <p className="mt-2 text-sm leading-6 text-slate-500">Use manual location entry or explicitly request browser geolocation.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
      <Input value={location} onChange={(event) => onChange(event.target.value)} placeholder="Address, place, online, or phone" className="rounded-xl border-white/10 bg-[#050812]" aria-label="Incident location" />
      <Button type="button" onClick={onCapture} disabled={loading} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">
        <MapPin className="mr-2 h-4 w-4" aria-hidden="true" />
        {loading ? "Capturing…" : "Use current location"}
      </Button>
    </div>
    {errorMessage && <p className="mt-3 text-sm text-amber-200">{errorMessage}</p>}
  </section>
);
