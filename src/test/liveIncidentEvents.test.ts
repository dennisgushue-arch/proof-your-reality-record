import { describe, expect, it } from "vitest";
import { buildIncidentDraftFromLiveEvents } from "@/lib/liveIncidentEvents";

describe("buildIncidentDraftFromLiveEvents", () => {
  it("sorts live transcript events chronologically before building the draft", () => {
    const draft = buildIncidentDraftFromLiveEvents([
      {
        occurredAt: "2026-06-01T10:05:00.000Z",
        text: "Voice transcript: second point",
        type: "transcript",
      },
      {
        occurredAt: "2026-06-01T10:00:00.000Z",
        text: "Voice transcript: first point",
        type: "transcript",
      },
      {
        occurredAt: "2026-06-01T10:02:00.000Z",
        text: "Witness added: Jordan",
        type: "witness",
      },
    ]);

    expect(draft.title).toBe("first point");
    expect(draft.occurredAt).toBe("2026-06-01T10:00");
    expect(draft.narrative).toContain("Transcript\nfirst point\nsecond point");
    expect(draft.narrative).toContain("Timeline events\n10:02 AM — Witness added: Jordan");
    expect(draft.peopleCsv).toBe("Jordan");
    expect(draft.tagsCsv).toBe("voice");
  });
});
