import { describe, expect, it } from "vitest";
import { applyDraftToState, createEmptyRecordingState, parseRecordingDraft, serializeRecordingDraft } from "../recordingState";
import type { RecordingDraft } from "../types";

const draft: RecordingDraft = {
  version: 1,
  stage: "context",
  captureMode: "type",
  caseId: "case-1",
  title: "Draft title",
  category: "Other",
  occurredAt: "2026-07-01T10:00",
  location: "Office",
  people: ["Alex"],
  narrative: "Draft narrative",
  transcriptEvents: [
    { id: "event-1", type: "note", text: "Manual note", occurredAt: "2026-07-01T10:00:00.000Z" },
  ],
  updatedAt: "2026-07-01T10:01:00.000Z",
};

describe("recordingState", () => {
  it("serializes and parses local metadata drafts", () => {
    expect(parseRecordingDraft(serializeRecordingDraft(draft))).toEqual(draft);
  });

  it("rejects malformed drafts", () => {
    expect(parseRecordingDraft("not json")).toBeNull();
    expect(parseRecordingDraft(JSON.stringify({ version: 999 }))).toBeNull();
    expect(parseRecordingDraft(JSON.stringify({ ...draft, people: "Alex" }))).toBeNull();
  });

  it("applies a restored draft without adding binary evidence", () => {
    const current = createEmptyRecordingState("Other");
    const restored = applyDraftToState(draft, current);

    expect(restored.title).toBe("Draft title");
    expect(restored.evidenceItems).toEqual([]);
  });

  it("restores drafts saved during submission back to review so users can retry", () => {
    const current = createEmptyRecordingState("Other");
    const restored = applyDraftToState({ ...draft, stage: "save" }, current);

    expect(restored.stage).toBe("review");
  });
});
