export const LIVE_INCIDENT_STORAGE_KEY = "proof-live-incident-active";
export const LIVE_INCIDENT_EVENT = "proof-live-incident-changed";

export type LiveIncidentState = {
  active: boolean;
  startedAt: string;
};

export function readLiveIncidentState(): LiveIncidentState | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LIVE_INCIDENT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LiveIncidentState;
  } catch {
    return null;
  }
}

export function writeLiveIncidentState(state: LiveIncidentState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_INCIDENT_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(LIVE_INCIDENT_EVENT));
}

export function clearLiveIncidentState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LIVE_INCIDENT_STORAGE_KEY);
  window.dispatchEvent(new Event(LIVE_INCIDENT_EVENT));
}
