import { describe, expect, it } from "vitest";
import { buildPrepareBriefing } from "@/lib/prepareInteraction";

describe("buildPrepareBriefing", () => {
  it("derives contradictions, gaps, and questions from incident analysis", () => {
    const briefing = buildPrepareBriefing({
      interactionType: "contractor-visit",
      scheduledAt: "2026-06-01T10:00:00.000Z",
      incidents: [
        {
          id: "1",
          title: "Kitchen update",
          occurred_at: "2026-05-05T10:00:00.000Z",
          raw_narrative: "Contractor said cabinets were already ordered.",
          neutral_summary: "Contractor said cabinets were already ordered.",
          ai_analysis: {
            key_claims: ["Cabinets were already ordered", "Completion would happen by April 18"],
            contradictions: ["April 18: cabinets already ordered. May 5: supplier delays prevented ordering."],
            missing_evidence: ["No delivery confirmation", "No signed change order"],
            follow_ups: ["Get supplier confirmation"],
          },
        },
      ],
    });

    expect(briefing.situationSummary[0]).toContain("1 incident");
    expect(briefing.priorityTopics.some((topic) => /cabinet|completion/i.test(topic))).toBe(true);
    expect(briefing.storyChangedRisks[0]).toContain("cabinets already ordered");
    expect(briefing.missingEvidence).toContain("No delivery confirmation");
    expect(briefing.recommendedQuestions.some((question) => /proof|delivery|completion/i.test(question))).toBe(true);
    expect(briefing.checklist.some((item) => item.label === "Arrival plan confirmed")).toBe(true);
  });
});
