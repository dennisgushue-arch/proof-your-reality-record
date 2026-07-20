import { describe, expect, it } from "vitest";
import {
  buildMissingEvidence,
  buildReplayEvents,
  countEvidenceItems,
  getEvidenceCompletionPercentage,
  getIncidentCompleteness,
  readContradictions,
  selectRecommendedCaseAction,
} from "../caseDetailUtils";
import type { CaseDetailIncidentRow } from "../types";

const incident = (overrides: Partial<CaseDetailIncidentRow>): CaseDetailIncidentRow => ({
  id: "incident-1",
  case_id: "case-1",
  title: "Base incident",
  occurred_at: "2026-07-02T12:00:00.000Z",
  location: "Office",
  people_involved: ["Alex"],
  tags: ["topic"],
  neutral_summary: "Neutral summary.",
  raw_narrative: "Documented narrative.",
  evidence_quality_score: 80,
  ai_analysis: null,
  created_at: "2026-07-02T12:00:00.000Z",
  updated_at: "2026-07-02T12:00:00.000Z",
  evidence_items: [{ id: "evidence-1", type: "photo", filename: "photo.jpg", storage_path: "path/photo.jpg", description: null, created_at: "2026-07-02T12:00:00.000Z" }],
  ...overrides,
});

describe("caseDetailUtils", () => {
  it("sorts replay events chronologically", () => {
    const events = buildReplayEvents([
      incident({ id: "later", title: "Later", occurred_at: "2026-07-05T12:00:00.000Z", evidence_items: [] }),
      incident({ id: "earlier", title: "Earlier", occurred_at: "2026-07-01T12:00:00.000Z", evidence_items: [] }),
    ]);

    expect(events[0].incidentId).toBe("earlier");
    expect(events.some((event) => event.kind === "incident")).toBe(true);
  });

  it("counts evidence items across incidents", () => {
    expect(
      countEvidenceItems([
        incident({ id: "one", evidence_items: [{ id: "a", type: "photo", filename: "a.jpg", storage_path: "a", description: null, created_at: "2026-07-01T00:00:00.000Z" }] }),
        incident({ id: "two", evidence_items: [{ id: "b", type: "file", filename: "b.pdf", storage_path: "b", description: null, created_at: "2026-07-01T00:00:00.000Z" }] }),
      ]),
    ).toBe(2);
  });

  it("extracts missing documentation from existing completion logic", () => {
    const missing = buildMissingEvidence([
      incident({
        location: null,
        people_involved: [],
        raw_narrative: "",
        neutral_summary: null,
        evidence_items: [],
      }),
    ]);

    expect(missing.map((item) => item.label)).toEqual(expect.arrayContaining(["Location", "People involved", "Supporting evidence"]));
  });

  it("rejects malformed contradiction data safely", () => {
    expect(readContradictions({ contradictions: "not an array" })).toEqual([]);
    expect(readContradictions({ contradictions: ["possible difference", 10, null] })).toEqual(["possible difference"]);
  });

  it("prioritizes recommended actions for empty and incomplete cases", () => {
    expect(selectRecommendedCaseAction({ caseId: "case-1", incidents: [], recommendedIncidentId: null }).type).toBe("record-incident");

    const action = selectRecommendedCaseAction({
      caseId: "case-1",
      incidents: [incident({ id: "needs-work", location: null, people_involved: [], raw_narrative: "", neutral_summary: null, evidence_items: [] })],
      recommendedIncidentId: "needs-work",
    });

    expect(action.type).toBe("complete-incident");
    expect(action.href).toBe("/incidents/needs-work");
  });

  it("calculates incident and empty-case completion", () => {
    expect(getIncidentCompleteness(incident({}))).toBe(100);
    expect(getEvidenceCompletionPercentage([])).toBe(0);
  });
});
