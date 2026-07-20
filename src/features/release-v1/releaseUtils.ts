import { hasBillingAccess, describeBillingAccess } from "@/lib/billing";
import { calculateOverallCompletion } from "@/lib/evidenceCompletion";
import type {
  ExportFormatOption,
  ExportReadinessModel,
  ExportSection,
  ExportSectionId,
  FirstRunAction,
  NormalizedSubscriptionStatus,
  OnboardingState,
  PremiumGateDecision,
  ReleaseCase,
  ReleaseIncident,
  SafeError,
  SubscriptionInput,
} from "./types";

export const ONBOARDING_STORAGE_KEY = "proof.release.v1.onboarding";

export const ONBOARDING_STEPS: OnboardingStepId[] = ["welcome", "use-case", "privacy", "first-record"];

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  version: 1,
  completed: false,
  completedAt: null,
  skipped: false,
};

export const TRUST_COPY = {
  privateByDesign: "Private by design. Your records stay scoped to your account.",
  userControlled: "You control what you record, review, and export.",
  aiReview: "AI output may contain errors and should be reviewed against original records.",
  noLegalAdvice: "Proof is not a law firm and does not provide legal advice.",
  exportSensitive: "Exports may contain sensitive personal information. Review before sharing.",
} as const;

export function parseOnboardingState(raw: string | null): OnboardingState {
  if (!raw) return DEFAULT_ONBOARDING_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_ONBOARDING_STATE;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return DEFAULT_ONBOARDING_STATE;
    return {
      version: 1,
      completed: record.completed === true,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
      skipped: record.skipped === true,
    };
  } catch {
    return DEFAULT_ONBOARDING_STATE;
  }
}

export function serializeOnboardingState(state: OnboardingState): string {
  return JSON.stringify(state);
}

export function completeOnboarding(skipped: boolean, now = new Date()): OnboardingState {
  return { version: 1, completed: true, completedAt: now.toISOString(), skipped };
}

export function shouldShowOnboarding(input: { state: OnboardingState; caseCount: number; incidentCount: number }): boolean {
  return !input.state.completed && input.caseCount === 0 && input.incidentCount === 0;
}

export function selectFirstRunAction(input: { caseCount: number; incidentCount: number; hasCreateCaseRoute: boolean }): FirstRunAction {
  if (input.caseCount === 0) {
    return {
      label: input.hasCreateCaseRoute ? "Create your first case" : "Start recording",
      href: input.hasCreateCaseRoute ? "/cases" : "/record",
      description: "Create a case, then record the first incident inside it.",
    };
  }

  if (input.incidentCount === 0) {
    return {
      label: "Record first incident",
      href: "/record",
      description: "Capture what happened and attach evidence where available.",
    };
  }

  return {
    label: "Review timeline",
    href: "/cases",
    description: "Open a case to review timeline, evidence, and Proof AI observations.",
  };
}

export function getSupportedExportFormats(): ExportFormatOption[] {
  return [
    {
      id: "browser-print-pdf",
      label: "Browser print / Save as PDF",
      description: "Uses the current browser print dialog. Choose Save as PDF if your device supports it.",
    },
    {
      id: "clipboard",
      label: "Copy prepared summary",
      description: "Copies the selected text sections for review or sharing outside Proof.",
    },
  ];
}

export function createDefaultExportSections(): ExportSection[] {
  return [
    { id: "overview", label: "Case overview", supported: true, selected: true },
    { id: "timeline", label: "Chronological timeline", supported: true, selected: true },
    { id: "incidents", label: "Incident summaries", supported: true, selected: true },
    { id: "evidence", label: "Evidence inventory", supported: true, selected: true },
    { id: "missing", label: "Missing documentation", supported: true, selected: true },
    { id: "ai", label: "AI-generated observations", supported: true, selected: false, aiDerived: true },
    { id: "differences", label: "Possible statement differences", supported: true, selected: true, aiDerived: true },
  ];
}

export function filterSupportedExportSections(sections: ExportSection[]): ExportSection[] {
  return sections.filter((section) => section.supported);
}

export function selectedSectionIds(sections: ExportSection[]): ExportSectionId[] {
  return filterSupportedExportSections(sections).filter((section) => section.selected).map((section) => section.id);
}

export function labelAIExportContent(text: string): string {
  const trimmed = text.trim();
  return trimmed ? `AI-generated observation — ${trimmed}` : "AI-generated observation — No observation available.";
}

export function normalizePeople(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function readStringArrayFromAI(ai: unknown, key: string): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const value = (ai as Record<string, unknown>)[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

export function countStatementDifferences(incidents: ReleaseIncident[]): number {
  return incidents.reduce((sum, incident) => sum + readStringArrayFromAI(incident.ai_analysis, "contradictions").length, 0);
}

export function countTimelineGaps(incidents: ReleaseIncident[], thresholdDays = 7): number {
  const sorted = [...incidents].sort((first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime());
  let gaps = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const diffDays = (new Date(sorted[index].occurred_at).getTime() - new Date(sorted[index - 1].occurred_at).getTime()) / 86_400_000;
    if (Number.isFinite(diffDays) && diffDays > thresholdDays) gaps += 1;
  }
  return gaps;
}

export function buildExportContext(caseRow: ReleaseCase, incidents: ReleaseIncident[]): { caseRow: ReleaseCase; incidents: ReleaseIncident[] } {
  return {
    caseRow,
    incidents: incidents.filter((incident) => incident.case_id === caseRow.id).sort((first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime()),
  };
}

export function buildExportReadiness(caseRow: ReleaseCase, incidents: ReleaseIncident[], sections: ExportSection[]): ExportReadinessModel {
  const context = buildExportContext(caseRow, incidents);
  const completion = calculateOverallCompletion(context.incidents);
  const evidenceCount = context.incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0);
  const missing = new Set<string>();
  context.incidents.forEach((incident) => {
    if (!incident.raw_narrative?.trim() && !incident.neutral_summary?.trim()) missing.add(`Narrative or summary for “${incident.title}”`);
    if (!incident.location?.trim()) missing.add(`Location for “${incident.title}”`);
    if (normalizePeople(incident.people_involved).length === 0) missing.add(`People involved for “${incident.title}”`);
    if ((incident.evidence_items?.length ?? 0) === 0) missing.add(`Supporting evidence for “${incident.title}”`);
  });

  return {
    caseTitle: caseRow.title,
    incidentCount: context.incidents.length,
    evidenceCount,
    completionScore: completion.score,
    missingDocumentation: Array.from(missing).slice(0, 6),
    timelineGapCount: countTimelineGaps(context.incidents),
    statementDifferenceCount: countStatementDifferences(context.incidents),
    selectedSections: filterSupportedExportSections(sections).filter((section) => section.selected),
  };
}

export function buildClipboardExport(caseRow: ReleaseCase, incidents: ReleaseIncident[], sections: ExportSection[]): string {
  const context = buildExportContext(caseRow, incidents);
  const enabled = new Set(selectedSectionIds(sections));
  const lines: string[] = [`${caseRow.title}`, caseRow.category, "", TRUST_COPY.noLegalAdvice, TRUST_COPY.exportSensitive, ""];

  if (enabled.has("overview") && caseRow.description) lines.push("CASE OVERVIEW", caseRow.description, "");
  if (enabled.has("timeline")) lines.push("CHRONOLOGICAL TIMELINE", ...context.incidents.map((incident) => `- ${new Date(incident.occurred_at).toLocaleString()} — ${incident.title}`), "");
  if (enabled.has("incidents")) lines.push("INCIDENT SUMMARIES", ...context.incidents.map((incident) => `- ${incident.title}: ${incident.neutral_summary || incident.raw_narrative || "No narrative documented."}`), "");
  if (enabled.has("evidence")) lines.push("EVIDENCE INVENTORY", ...context.incidents.flatMap((incident) => (incident.evidence_items ?? []).map((item) => `- ${incident.title}: ${item.filename || item.type || "Evidence item"}`)), "");
  if (enabled.has("missing")) lines.push("MISSING DOCUMENTATION", ...buildExportReadiness(caseRow, context.incidents, sections).missingDocumentation.map((item) => `- ${item}`), "");
  if (enabled.has("differences")) lines.push("POSSIBLE STATEMENT DIFFERENCES", ...context.incidents.flatMap((incident) => readStringArrayFromAI(incident.ai_analysis, "contradictions").map((item) => `- ${incident.title}: ${item}`)), "");
  if (enabled.has("ai")) lines.push("AI-GENERATED OBSERVATIONS", ...context.incidents.flatMap((incident) => readStringArrayFromAI(incident.ai_analysis, "key_claims").map(labelAIExportContent)), "");

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeSubscriptionStatus(subscription: SubscriptionInput): NormalizedSubscriptionStatus {
  if (!subscription) {
    return {
      planLabel: "Free",
      statusLabel: "Billing unavailable",
      accessLabel: "Free plan · basic access only",
      renewalLabel: null,
      hasAccess: false,
      unavailable: true,
    };
  }

  const planLabel = subscription.plan ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1) : "Free";
  const renewalLabel = subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : null;
  return {
    planLabel,
    statusLabel: subscription.status || "unknown",
    accessLabel: describeBillingAccess(subscription),
    renewalLabel,
    hasAccess: hasBillingAccess(subscription),
    unavailable: false,
  };
}

export function decidePremiumGate(input: { subscription: SubscriptionInput; featureIsCurrentlyFree: boolean; featureName: string }): PremiumGateDecision {
  if (input.featureIsCurrentlyFree) return { allowed: true, reason: null };
  if (hasBillingAccess(input.subscription)) return { allowed: true, reason: null };
  return {
    allowed: false,
    reason: `${input.featureName} requires an active premium subscription. Your work will remain available while you upgrade.`,
    upgradeHref: "/pricing",
  };
}

export function getTrustCopy(key: keyof typeof TRUST_COPY): string {
  return TRUST_COPY[key];
}

export function normalizeOfflineState(isOnline: boolean): { offline: boolean; message: string } {
  return isOnline
    ? { offline: false, message: "Online" }
    : { offline: true, message: "You appear to be offline. Changes that require the network may fail until the connection returns." };
}

export function normalizeSafeError(error: unknown, fallback = "Something went wrong. Please try again."): SafeError {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : fallback;
  const safeMessage = /apikey|service_role|authorization|bearer|storage_path|internal prompt/i.test(message) ? fallback : message;
  return {
    title: "Something needs attention",
    message: safeMessage || fallback,
    retryable: !/forbidden|unauthorized|not found/i.test(safeMessage),
  };
}

export function preserveRouteQuery(pathname: string, search: string): string {
  return `${pathname}${search}`;
}

export function truncateForLayout(value: string, maxLength = 80): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}
