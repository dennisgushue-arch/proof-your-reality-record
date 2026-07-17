import { supabase } from "@/integrations/supabase/client";

export type LiveIncidentEventType = "system" | "transcript" | "screenshot" | "photo" | "witness" | "note";

export type LiveIncidentEvent = {
  occurredAt: string;
  text: string;
  type: LiveIncidentEventType;
};

export type LiveIncidentDraft = {
  title: string;
  occurredAt: string;
  peopleCsv: string;
  tagsCsv: string;
  narrative: string;
};

export async function persistLiveIncidentEvent(input: {
  userId: string;
  sessionId: string;
  type: LiveIncidentEventType;
  text: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}) {
  const { userId, sessionId, type, text, occurredAt = new Date().toISOString(), metadata = {} } = input;

  return supabase.from("live_incident_events").insert({
    user_id: userId,
    session_id: sessionId,
    event_type: type,
    event_text: text,
    occurred_at: occurredAt,
    metadata: metadata as never,
  });
}

export async function loadLiveIncidentEvents(userId: string, sessionId: string) {
  const { data, error } = await supabase
    .from("live_incident_events")
    .select("event_type, event_text, occurred_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("occurred_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    occurredAt: row.occurred_at,
    text: row.event_text,
    type: row.event_type as LiveIncidentEventType,
  }));
}

function toLocalDateTimeInputValue(isoString: string) {
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function buildIncidentDraftFromLiveEvents(events: LiveIncidentEvent[]): LiveIncidentDraft {
  if (!events.length) {
    const now = new Date().toISOString();
    return {
      title: "Live incident",
      occurredAt: toLocalDateTimeInputValue(now),
      peopleCsv: "",
      tagsCsv: "",
      narrative: "",
    };
  }

  const sorted = [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const firstOccurredAt = sorted[0]?.occurredAt ?? new Date().toISOString();

  const transcriptLines = sorted
    .filter((event) => event.type === "transcript")
    .map((event) => event.text.replace(/^Voice transcript:\s*/i, ""));

  const actionLines = sorted
    .filter((event) => event.type !== "transcript")
    .map((event) => `${new Date(event.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ${event.text}`);

  const witnessPeople = sorted
    .filter((event) => event.type === "witness")
    .map((event) => event.text.replace(/^Witness added:\s*/i, "").trim())
    .filter(Boolean);

  const narrativeParts = [
    transcriptLines.length
      ? `Transcript\n${transcriptLines.join("\n")}`
      : "",
    actionLines.length
      ? `Timeline events\n${actionLines.join("\n")}`
      : "",
  ].filter(Boolean);

  const titleSource = transcriptLines[0]?.replace(/^[“"]|[”"]$/g, "") ?? "Live incident";
  const compactTitle = titleSource.length > 70 ? `${titleSource.slice(0, 67).trimEnd()}…` : titleSource;

  const tags = new Set<string>();
  if (sorted.some((event) => event.type === "transcript")) tags.add("voice");
  if (sorted.some((event) => event.type === "photo" || event.type === "screenshot")) tags.add("evidence");

  return {
    title: compactTitle || "Live incident",
    occurredAt: toLocalDateTimeInputValue(firstOccurredAt),
    peopleCsv: witnessPeople.join(", "),
    tagsCsv: Array.from(tags).join(", "),
    narrative: narrativeParts.join("\n\n"),
  };
}
