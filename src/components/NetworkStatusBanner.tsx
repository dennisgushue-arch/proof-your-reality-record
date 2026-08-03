import { useEffect, useState } from "react";
import { CloudOff, Wifi } from "lucide-react";

export const NetworkStatusBanner = () => {
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine ?? true);
  const [reconnected, setReconnected] = useState(false);

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setReconnected(false);
    };
    const handleOnline = () => {
      setOnline(true);
      setReconnected(true);
      globalThis.setTimeout(() => setReconnected(false), 3500);
    };
    globalThis.addEventListener("offline", handleOffline);
    globalThis.addEventListener("online", handleOnline);
    return () => {
      globalThis.removeEventListener("offline", handleOffline);
      globalThis.removeEventListener("online", handleOnline);
    };
  }, []);

  if (online && !reconnected) return null;

  return (
    <div className={`fixed inset-x-3 top-3 z-[120] mx-auto flex max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${online ? "border-emerald-300/25 bg-emerald-950/95 text-emerald-50" : "border-amber-300/25 bg-amber-950/95 text-amber-50"}`} role="status" aria-live="polite">
      {online ? <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" /> : <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />}
      <div>
        <p className="text-sm font-bold">{online ? "Connection restored" : "You’re offline"}</p>
        <p className="mt-0.5 text-xs leading-5 opacity-80">{online ? "Proof can save and refresh records again." : "Your open page remains available, but saving, AI analysis, uploads, and billing need a network connection."}</p>
      </div>
    </div>
  );
};