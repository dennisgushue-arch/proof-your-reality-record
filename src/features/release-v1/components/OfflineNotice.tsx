import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { normalizeOfflineState } from "../releaseUtils";

export const OfflineNotice = () => {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const state = normalizeOfflineState(online);
  if (!state.offline) return null;

  return (
    <div className="fixed inset-x-3 top-3 z-[60] rounded-2xl border border-amber-300/25 bg-amber-300/15 px-4 py-3 text-sm text-amber-50 shadow-lg backdrop-blur" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-3xl items-start gap-2">
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>{state.message}</p>
      </div>
    </div>
  );
};
