import { describe, expect, it } from "vitest";
import {
  buildClipboardExport,
  buildExportContext,
  buildExportReadiness,
  completeOnboarding,
  createDefaultExportSections,
  decidePremiumGate,
  filterSupportedExportSections,
  getSupportedExportFormats,
  getTrustCopy,
  labelAIExportContent,
  normalizeOfflineState,
  normalizeSafeError,
  normalizeSubscriptionStatus,
  parseOnboardingState,
  preserveRouteQuery,
  selectFirstRunAction,
  shouldShowOnboarding,
  truncateForLayout,
} from "../releaseUtils";
import type { ReleaseCase, ReleaseIncident } from "../types";

const caseRow: ReleaseCase = { id: "case-1", title: "Long repair record", category: "Housing", description: "Case overview." };
const incidents: ReleaseIncident[] = [
  {
    id: "inc-1",
    case_id: "case-1",
    title: "First incident",
    occurred_at: "2026-07-01T10:00:00.000Z",
    location: "Apartment",
    people_involved: ["Alex"],
    raw_narrative: "Narrative",
    neutral_summary: "Summary",
    ai_analysis: { contradictions: ["Possible mismatch"], key_claims: ["Claim recorded"] },
    evidence_items: [{ id: "ev-1", filename: "photo.jpg", type: "image" }],
  },
  {
    id: "inc-other",
    case_id: "case-2",
    title: "Other case incident",
    occurred_at: "2026-07-02T10:00:00.000Z",
    raw_narrative: "Other narrative",
    evidence_items: [],
  },
];

describe("releaseUtils", () => {
  it("parses onboarding completion and preserves returning-user behavior", () => {
    const completed = completeOnboarding(false, new Date("2026-07-01T10:00:00.000Z"));
    expect(parseOnboardingState(JSON.stringify(completed))).toEqual(completed);
    expect(shouldShowOnboarding({ state: completed, caseCount: 0, incidentCount: 0 })).toBe(false);
    expect(shouldShowOnboarding({ state: parseOnboardingState(null), caseCount: 0, incidentCount: 0 })).toBe(true);
  });

  it("selects coherent first-run actions", () => {
    expect(selectFirstRunAction({ caseCount: 0, incidentCount: 0, hasCreateCaseRoute: true }).href).toBe("/cases");
    expect(selectFirstRunAction({ caseCount: 1, incidentCount: 0, hasCreateCaseRoute: true }).href).toBe("/record");
  });

  it("filters unsupported export sections and formats", () => {
    const sections = [...createDefaultExportSections(), { id: "ai" as const, label: "Unsupported", supported: false, selected: true }];
    expect(filterSupportedExportSections(sections).every((section) => section.supported)).toBe(true);
    expect(getSupportedExportFormats().map((format) => format.id)).toEqual(["browser-print-pdf", "clipboard"]);
  });

  it("labels AI content in export", () => {
    expect(labelAIExportContent("Pattern noted")).toMatch(/^AI-generated observation/);
  });

  it("normalizes subscription and unknown billing status", () => {
    expect(normalizeSubscriptionStatus(null)).toMatchObject({ unavailable: true, planLabel: "Free" });
    expect(normalizeSubscriptionStatus({ plan: "premium", status: "active", current_period_end: null })).toMatchObject({ unavailable: false, planLabel: "Premium" });
  });

  it("decides premium gates without blocking currently-free features", () => {
    expect(decidePremiumGate({ subscription: null, featureIsCurrentlyFree: true, featureName: "Export" }).allowed).toBe(true);
    expect(decidePremiumGate({ subscription: null, featureIsCurrentlyFree: false, featureName: "Premium feature" })).toMatchObject({ allowed: false, upgradeHref: "/pricing" });
  });

  it("selects approved trust copy", () => {
    expect(getTrustCopy("noLegalAdvice")).toMatch(/not a law firm/i);
    expect(getTrustCopy("privateByDesign")).not.toMatch(/end-to-end|HIPAA|SOC 2/i);
  });

  it("normalizes offline and safe error states", () => {
    expect(normalizeOfflineState(false).offline).toBe(true);
    expect(normalizeSafeError("service_role key leaked").message).not.toMatch(/service_role/i);
  });

  it("excludes unrelated case records in export context", () => {
    const context = buildExportContext(caseRow, incidents);
    expect(context.incidents).toHaveLength(1);
    expect(context.incidents[0].id).toBe("inc-1");
  });

  it("builds export readiness and clipboard output from selected sections", () => {
    const sections = createDefaultExportSections();
    const readiness = buildExportReadiness(caseRow, incidents, sections);
    expect(readiness.incidentCount).toBe(1);
    expect(readiness.evidenceCount).toBe(1);
    expect(readiness.statementDifferenceCount).toBe(1);
    expect(buildClipboardExport(caseRow, incidents, sections)).toContain("POSSIBLE STATEMENT DIFFERENCES");
  });

  it("preserves route query and truncates long layout text", () => {
    expect(preserveRouteQuery("/ai", "?case=case-1")).toBe("/ai?case=case-1");
    expect(truncateForLayout("a".repeat(90), 20)).toHaveLength(20);
  });
});
