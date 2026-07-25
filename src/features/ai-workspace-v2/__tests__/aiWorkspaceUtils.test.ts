import { describe, expect, it } from "vitest";
import {
  buildCaseContextSummary,
  buildSuggestedPrompts,
  countEvidenceItems,
  mapSourceReferences,
  normalizeAIError,
  normalizeAIResponse,
  normalizeNeutralText,
  parseSelectedCase,
  readContradictionEntries,
  safeMarkdownText,
  sortIncidentsChronologically,
} from "../aiWorkspaceUtils";
import type { AIWorkspaceCaseRow, AIWorkspaceIncidentRow } from "../types";

const caseRow: AIWorkspaceCaseRow = {
  id: "case-1",
  title: "Repair timeline",
  category: "Housing",
  description: "Documented repair dispute.",
  updated_at: "2026-07-10T10:00:00.000Z",
};

const incident = (overrides: Partial<AIWorkspaceIncidentRow>): AIWorkspaceIncidentRow => ({
  id: "inc-1",
  case_id: "case-1",
  title: "First incident",
  occurred_at: "2026-07-01T10:00:00.000Z",
  location: "Apartment",
  people_involved: ["Alex"],
  tags: ["repair"],
  raw_narrative: "Documented narrative.",
  neutral_summary: "Neutral summary.",
  evidence_quality_score: 80,
  ai_analysis: null,
  created_at: "2026-07-01T10:00:00.000Z",
  updated_at: "2026-07-01T10:00:00.000Z",
  evidence_items: [],
  ...overrides,
});

describe("aiWorkspaceUtils", () => {
  it("parses selected case from supported route query parameters", () => {
    expect(parseSelectedCase("?case=case-1", ["case-1"])).toBe("case-1");
    expect(parseSelectedCase("?caseId=case-2", ["case-2"])).toBe("case-2");
    expect(parseSelectedCase("?case=other", ["case-1"])).toBe("");
  });

  it("constructs case context from only the selected case records", () => {
    const selectedOnly = [incident({ id: "inc-1", case_id: "case-1" })];
    const summary = buildCaseContextSummary(caseRow, selectedOnly);

    expect(summary.incidentCount).toBe(1);
    expect(summary.caseRow.id).toBe("case-1");
    expect(summary.findings.some((finding) => finding.description.includes("other case"))).toBe(false);
  });

  it("counts evidence items without storage paths", () => {
    const count = countEvidenceItems([
      incident({ evidence_items: [{ id: "ev-1", type: "image", filename: "photo.jpg", description: null, created_at: "2026-07-01T10:00:00.000Z" }] }),
      incident({ id: "inc-2", evidence_items: [{ id: "ev-2", type: "document", filename: "receipt.pdf", description: null, created_at: "2026-07-02T10:00:00.000Z" }] }),
    ]);

    expect(count).toBe(2);
  });

  it("orders incidents chronologically", () => {
    const sorted = sortIncidentsChronologically([
      incident({ id: "later", occurred_at: "2026-08-01T10:00:00.000Z" }),
      incident({ id: "earlier", occurred_at: "2026-07-01T10:00:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["earlier", "later"]);
  });

  it("rejects malformed contradiction structures", () => {
    expect(readContradictionEntries({ contradictions: [{ bad: { nested: true } }, 42, null] }, incident({}))).toEqual([]);
  });

  it("normalizes unsafe finding language into neutral review language", () => {
    expect(normalizeNeutralText("This proves guilt and deception.")).not.toMatch(/guilt|deception/i);
    const response = normalizeAIResponse({ title: "Truth probability", summary: "No legal conclusion.", findings: [{ label: "Contradiction", value: "A lie" }], recommendations: [] });
    expect(response.title).not.toMatch(/truth probability/i);
    expect(response.findings[0].label).toBe("Possible statement difference");
    expect(response.findings[0].value).not.toMatch(/lie/i);
  });

  it("maps source references only when identifiers match loaded records", () => {
    const incidents = [incident({ id: "inc-1", title: "Loaded incident" })];
    const mapped = mapSourceReferences([{ incidentId: "inc-1", title: "Loaded incident" }], incidents);

    expect(mapped.mode).toBe("sources-cited");
    expect(mapped.sources[0].href).toBe("/incidents/inc-1");
  });

  it("does not fabricate citations when no source identifiers are returned", () => {
    const mapped = mapSourceReferences(undefined, [incident({ id: "inc-1" })]);

    expect(mapped.mode).toBe("records-considered");
    expect(mapped.sources[0].incidentId).toBe("inc-1");
  });

  it("shows only supported suggested prompts", () => {
    const noEvidenceSummary = buildCaseContextSummary(caseRow, [incident({ evidence_items: [] })]);
    expect(buildSuggestedPrompts(noEvidenceSummary).some((prompt) => prompt.id === "evidence")).toBe(false);
  });

  it("strips unsafe HTML and javascript markdown", () => {
    expect(safeMarkdownText("<script>alert(1)</script>[x](javascript:alert(1))")).not.toMatch(/<script>|javascript:/i);
  });

  it("normalizes usage-limit and generic AI errors", () => {
    expect(normalizeAIError(new Error("quota limit reached")).state).toBe("limit-reached");
    expect(normalizeAIError(new Error("network failed")).message).toMatch(/could not complete/i);
  });
});
