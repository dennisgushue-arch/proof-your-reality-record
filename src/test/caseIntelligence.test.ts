import { describe, expect, it } from "vitest";
import { analyzeCase } from "@/lib/caseIntelligence";

describe("analyzeCase", () => {
  it("identifies incomplete documentation and recommends a target incident", () => {
    const result = analyzeCase([
      {
        id: "one",
        title: "Initial report",
        occurred_at: "2026-07-01T10:00:00Z",
        location: null,
        people_involved: [],
        raw_narrative: "",
        neutral_summary: null,
        evidence_items: [],
      },
      {
        id: "two",
        title: "Follow-up",
        occurred_at: "2026-07-10T10:00:00Z",
        location: "Office",
        people_involved: ["Alex"],
        raw_narrative: "Follow-up discussion documented.",
        neutral_summary: null,
        evidence_items: [{ id: "e1", type: "photo" }],
      },
    ]);

    expect(result.recommendedIncidentId).toBe("one");
    expect(result.timelineGapCount).toBe(1);
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.evidenceStrength).toBeLessThan(75);
  });

  it("reports stronger records when incidents and evidence are complete", () => {
    const result = analyzeCase([
      {
        id: "one",
        title: "Incident one",
        occurred_at: "2026-07-01T10:00:00Z",
        location: "Home",
        people_involved: ["Alex"],
        raw_narrative: "A complete narrative.",
        neutral_summary: "Neutral summary.",
        evidence_quality_score: 90,
        evidence_items: [{ id: "e1" }, { id: "e2" }],
      },
      {
        id: "two",
        title: "Incident two",
        occurred_at: "2026-07-02T10:00:00Z",
        location: "Home",
        people_involved: ["Alex"],
        raw_narrative: "Another complete narrative.",
        neutral_summary: "Neutral summary.",
        evidence_quality_score: 88,
        evidence_items: [{ id: "e3" }, { id: "e4" }],
      },
      {
        id: "three",
        title: "Incident three",
        occurred_at: "2026-07-03T10:00:00Z",
        location: "Home",
        people_involved: ["Alex"],
        raw_narrative: "A third complete narrative.",
        neutral_summary: "Neutral summary.",
        evidence_quality_score: 92,
        evidence_items: [{ id: "e5" }],
      },
    ]);

    expect(result.evidenceStrength).toBeGreaterThanOrEqual(75);
    expect(result.strengthLabel).toBe("Strong");
    expect(result.missing).toEqual([]);
  });
});
