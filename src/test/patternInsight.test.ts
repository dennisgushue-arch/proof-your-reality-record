import { describe, expect, it } from "vitest";
import { buildPatternInsight } from "@/lib/patternInsight";

describe("buildPatternInsight", () => {
  it("flags recurring contradictions first", () => {
    const insight = buildPatternInsight(
      { title: "Case A" },
      [
        {
          occurred_at: "2026-06-01T09:00:00.000Z",
          tags: ["billing"],
          people_involved: ["Sam"],
          ai_analysis: { contradictions: ["Promise changed", "Date changed"] },
        },
        {
          occurred_at: "2026-06-02T09:00:00.000Z",
          tags: ["billing"],
          people_involved: ["Sam"],
          ai_analysis: { contradictions: ["New date"], missing_evidence: [] },
        },
      ],
    );

    expect(insight.headline).toBe("Recurring contradiction cluster");
    expect(insight.body).toContain("3 contradiction flags");
  });

  it("detects repeated tags when contradiction count is low", () => {
    const insight = buildPatternInsight(
      { title: "Case B" },
      [
        {
          occurred_at: "2026-06-01T09:00:00.000Z",
          tags: ["delivery"],
          people_involved: ["Alex"],
          ai_analysis: { contradictions: [] },
        },
        {
          occurred_at: "2026-06-02T09:00:00.000Z",
          tags: ["Delivery"],
          people_involved: ["Jordan"],
          ai_analysis: { contradictions: [] },
        },
      ],
    );

    expect(insight.headline).toBe("Repeated tag: delivery");
    expect(insight.body).toContain("2 incidents");
  });

  it("uses chronological cadence when incidents are out of order", () => {
    const insight = buildPatternInsight(
      { title: "Case C" },
      [
        {
          occurred_at: "2026-06-05T09:00:00.000Z",
          tags: [],
          people_involved: [],
          ai_analysis: { contradictions: [] },
        },
        {
          occurred_at: "2026-06-01T09:00:00.000Z",
          tags: [],
          people_involved: [],
          ai_analysis: { contradictions: [] },
        },
        {
          occurred_at: "2026-06-03T09:00:00.000Z",
          tags: [],
          people_involved: [],
          ai_analysis: { contradictions: [] },
        },
      ],
    );

    expect(insight.headline).toBe("Recurring incident cadence");
    expect(insight.body).toContain("3 incidents over 4 days");
  });
});
