import { describe, expect, it } from "vitest";
import {
  buildNarrativeFromEvents,
  calculateDocumentationStrength,
  createSubmissionGuard,
  dedupeEvidenceItems,
  normalizePeople,
  parseRecordQuery,
  sortTranscriptEvents,
  summarizeEvidenceUploadResult,
  validateRequiredFields,
} from "../recordingUtils";
import type { PendingEvidenceItem, TranscriptEvent } from "../types";

const event = (overrides: Partial<TranscriptEvent>): TranscriptEvent => ({
  id: "event-1",
  type: "transcript",
  text: "Base transcript",
  occurredAt: "2026-07-01T10:00:00.000Z",
  ...overrides,
});

const evidence = (file: File): PendingEvidenceItem => ({
  id: `${file.name}-${file.size}`,
  file,
  filename: file.name,
  type: file.type.split("/")[0] || "file",
  capturedAt: "2026-07-01T10:00:00.000Z",
  source: "files",
  status: "pending",
});

describe("recordingUtils", () => {
  it("sorts live events chronologically", () => {
    const sorted = sortTranscriptEvents([
      event({ id: "later", occurredAt: "2026-07-01T10:05:00.000Z" }),
      event({ id: "earlier", occurredAt: "2026-07-01T10:01:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["earlier", "later"]);
  });

  it("constructs transcript narrative while excluding interim text", () => {
    const narrative = buildNarrativeFromEvents([
      event({ id: "interim", text: "interim text", interim: true }),
      event({ id: "final", text: "final text", interim: false }),
      event({ id: "photo", type: "photo", text: "Evidence captured: photo.jpg" }),
    ], "typed notes");

    expect(narrative).toContain("typed notes");
    expect(narrative).toContain("final text");
    expect(narrative).toContain("Evidence captured: photo.jpg");
    expect(narrative).not.toContain("interim text");
  });

  it("validates required save fields", () => {
    expect(validateRequiredFields({ caseId: "", title: "", narrative: "", transcriptEvents: [] })).toEqual({
      valid: false,
      missing: ["case", "title", "description or transcript"],
    });
  });

  it("calculates neutral documentation strength", () => {
    const result = calculateDocumentationStrength({
      title: "Incident",
      occurredAt: "2026-07-01T10:00:00.000Z",
      location: "Office",
      people: ["Alex"],
      narrative: "Documented narrative",
      evidenceCount: 1,
      category: "Workplace",
    });

    expect(result.score).toBe(100);
    expect(result.label).toBe("Ready to review");
  });

  it("prevents duplicate submissions with a guard", () => {
    const guard = createSubmissionGuard();
    expect(guard.begin()).toBe(true);
    expect(guard.begin()).toBe(false);
    guard.reset();
    expect(guard.begin()).toBe(true);
  });

  it("deduplicates evidence items by filename, size, and modified timestamp", () => {
    const file = new File(["hello"], "photo.jpg", { type: "image/jpeg", lastModified: 100 });
    expect(dedupeEvidenceItems([evidence(file), evidence(file)])).toHaveLength(1);
  });

  it("normalizes people names without inferring names", () => {
    expect(normalizePeople(" Alex, alex, Jordan ,, ")).toEqual(["Alex", "Jordan"]);
  });

  it("summarizes partial evidence upload failures", () => {
    expect(summarizeEvidenceUploadResult({ successful: [{ filename: "a.jpg", storagePath: "path", type: "image" }], failed: [{ filename: "b.jpg", message: "Upload failed" }] }).state).toBe("partial");
  });

  it("parses existing record route query parameters", () => {
    expect(parseRecordQuery("?caseId=case-1")).toEqual({ caseId: "case-1" });
    expect(parseRecordQuery("?case=case-2")).toEqual({ caseId: "case-2" });
  });
});
