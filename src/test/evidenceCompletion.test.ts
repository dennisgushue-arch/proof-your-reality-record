import { describe, expect, it } from "vitest";
import { calculateIncidentCompletion, calculateOverallCompletion } from "@/lib/evidenceCompletion";

const base = {
  id: "incident-1",
  case_id: "case-1",
  title: "Test incident",
  occurred_at: "2026-07-17T12:00:00.000Z",
};

describe("evidence completion", () => {
  it("returns 100 for a fully documented incident", () => {
    const result = calculateIncidentCompletion({
      ...base,
      raw_narrative: "A factual narrative.",
      neutral_summary: "A neutral summary.",
      location: "Las Vegas",
      people_involved: ["Person A"],
      evidence_items: [{ type: "photo", filename: "photo.jpg", storage_path: "x/photo.jpg" }],
    });
    expect(result.score).toBe(100);
    expect(result.missing).toHaveLength(0);
  });

  it("prioritizes the least complete incident", () => {
    const overall = calculateOverallCompletion([
      { ...base, raw_narrative: "Documented", location: "A", people_involved: ["A"] },
      { ...base, id: "incident-2", title: "Needs work", raw_narrative: "" },
    ]);
    expect(overall.next?.incidentId).toBe("incident-2");
  });
});
