import { describe, expect, it } from "vitest";
import {
  isSummarizePrompt,
  isLivePrompt,
  normalizeApiResponse,
  createDemoResponse,
} from "@/lib/aiSummarize.js";

const demoCase = {
  id: "case-1",
  title: "Apartment Repair Dispute",
  incidents: 8,
  evidenceItems: 14,
  contradictions: 1,
  timelineGaps: 2,
};

// ─── isSummarizePrompt ────────────────────────────────────────────────────────

describe("isSummarizePrompt", () => {
  it("matches 'Summarize this case'", () => {
    expect(isSummarizePrompt("Summarize this case")).toBe(true);
  });

  it("matches 'Refresh and summarize this case'", () => {
    expect(isSummarizePrompt("Refresh and summarize this case")).toBe(true);
  });

  it("matches the generate-summary action prompt", () => {
    expect(isSummarizePrompt("Create a neutral factual summary of this case.")).toBe(true);
  });

  it("matches 'Generate case summary'", () => {
    expect(isSummarizePrompt("Generate case summary")).toBe(true);
  });

  it("does not match contradiction review prompts", () => {
    expect(isSummarizePrompt("Find possible contradictions")).toBe(false);
  });

  it("does not match missing evidence prompts", () => {
    expect(isSummarizePrompt("What evidence is missing?")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSummarizePrompt("SUMMARIZE THIS CASE")).toBe(true);
  });
});

// ─── isLivePrompt ─────────────────────────────────────────────────────────────

describe("isLivePrompt", () => {
  it("returns true for summarize prompts", () => {
    expect(isLivePrompt("Summarize this case")).toBe(true);
  });

  it("returns false for non-summarize prompts", () => {
    expect(isLivePrompt("Build a chronological timeline")).toBe(false);
  });
});

// ─── normalizeApiResponse ─────────────────────────────────────────────────────

describe("normalizeApiResponse", () => {
  it("extracts title, summary, findings, and recommendations from a valid response", () => {
    const raw = {
      title: "Contractor dispute brief",
      summary: "Three incidents document a pattern of changing statements.",
      findings: [
        { label: "Contradiction", value: "Completion date changed twice." },
        { label: "Missing evidence", value: "Payment receipt not uploaded." },
      ],
      recommendations: ["Upload receipt.", "Request written confirmation."],
    };

    const result = normalizeApiResponse(raw, demoCase);

    expect(result.title).toBe("Contractor dispute brief");
    expect(result.summary).toContain("changing statements");
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].label).toBe("Contradiction");
    expect(result.recommendations).toHaveLength(2);
  });

  it("includes incidentId when provided in finding", () => {
    const raw = {
      title: "Brief",
      summary: "Summary.",
      findings: [{ label: "Note", value: "Detail.", incidentId: "inc-123" }],
      recommendations: [],
    };

    const result = normalizeApiResponse(raw, demoCase);
    expect(result.findings[0].incidentId).toBe("inc-123");
  });

  it("also accepts incident_id (snake_case) in findings", () => {
    const raw = {
      title: "Brief",
      summary: "Summary.",
      findings: [{ label: "Note", value: "Detail.", incident_id: "inc-456" }],
      recommendations: [],
    };

    const result = normalizeApiResponse(raw, demoCase);
    expect(result.findings[0].incidentId).toBe("inc-456");
  });

  it("falls back to demo response when data is null", () => {
    const result = normalizeApiResponse(null, demoCase);
    expect(result.title).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(Array.isArray(result.findings)).toBe(true);
  });

  it("falls back to demo response when data is missing required fields", () => {
    const result = normalizeApiResponse({}, demoCase);
    expect(result.title).toBeTruthy();
    expect(result.summary).toBeTruthy();
  });

  it("normalizes confidence to valid enum or omits it", () => {
    const high = normalizeApiResponse({ title: "T", summary: "S", findings: [], recommendations: [], confidence: "High" }, demoCase);
    expect(high.confidence).toBe("high");

    const invalid = normalizeApiResponse({ title: "T", summary: "S", findings: [], recommendations: [], confidence: "uncertain" }, demoCase);
    expect(invalid.confidence).toBeUndefined();
  });

  it("parses sources list and normalizes occurredAt", () => {
    const raw = {
      title: "Brief",
      summary: "Summary.",
      findings: [],
      recommendations: [],
      sources: [
        { incidentId: "inc-1", title: "First incident", occurredAt: "2026-04-01T10:00:00Z" },
        { incidentId: "inc-2", title: "Second incident", occurred_at: "2026-04-05T10:00:00Z" },
      ],
    };

    const result = normalizeApiResponse(raw, demoCase);
    expect(result.sources).toHaveLength(2);
    expect(result.sources![0].incidentId).toBe("inc-1");
    expect(result.sources![1].occurredAt).toBe("2026-04-05T10:00:00Z");
  });

  it("drops findings that are missing label or value", () => {
    const raw = {
      title: "Brief",
      summary: "Summary.",
      findings: [
        { label: "", value: "has value but no label" },
        { label: "has label", value: "" },
        { label: "Good", value: "Both present." },
      ],
      recommendations: [],
    };

    const result = normalizeApiResponse(raw, demoCase);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].label).toBe("Good");
  });
});

// ─── createDemoResponse ───────────────────────────────────────────────────────

describe("createDemoResponse", () => {
  it("returns contradiction brief for contradiction prompts", () => {
    const result = createDemoResponse("Find possible contradictions", demoCase);
    expect(result.title).toBe("Potential inconsistency review");
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("returns evidence brief for missing evidence prompts", () => {
    const result = createDemoResponse("What evidence is missing?", demoCase);
    expect(result.title).toBe("Evidence coverage review");
  });

  it("returns timeline brief for timeline prompts", () => {
    const result = createDemoResponse("Build a chronological timeline", demoCase);
    expect(result.title).toBe("Timeline reconstruction");
    expect(result.summary).toContain("8 incidents");
  });

  it("returns preparation brief for prepare prompts", () => {
    const result = createDemoResponse("Prepare me for my next interaction", demoCase);
    expect(result.title).toBe("Interaction preparation brief");
  });

  it("returns generic AI case brief for unrecognized prompts", () => {
    const result = createDemoResponse("Something else entirely", demoCase);
    expect(result.title).toBe("AI case brief");
    expect(result.summary).toContain("Apartment Repair Dispute");
    expect(result.summary).toContain("8 incidents");
  });

  it("always returns findings and recommendations arrays", () => {
    const prompts = [
      "Summarize this case",
      "Find contradictions",
      "What evidence is missing?",
      "Timeline please",
      "Prepare me",
      "Unknown prompt",
    ];

    prompts.forEach((p) => {
      const result = createDemoResponse(p, demoCase);
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});
