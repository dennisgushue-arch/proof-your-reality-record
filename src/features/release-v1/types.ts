import type { BillingSubscription } from "@/lib/billing";

export type OnboardingStepId = "welcome" | "use-case" | "privacy" | "first-record";

export type OnboardingState = {
  version: 1;
  completed: boolean;
  completedAt: string | null;
  skipped: boolean;
};

export type FirstRunAction = {
  label: string;
  href: string;
  description: string;
};

export type ExportSectionId = "overview" | "timeline" | "incidents" | "evidence" | "missing" | "ai" | "differences";

export type ExportSection = {
  id: ExportSectionId;
  label: string;
  supported: boolean;
  selected: boolean;
  aiDerived?: boolean;
};

export type SupportedExportFormat = "browser-print-pdf" | "clipboard";

export type ExportFormatOption = {
  id: SupportedExportFormat;
  label: string;
  description: string;
};

export type ReleaseEvidenceItem = {
  id?: string;
  filename?: string | null;
  type?: string | null;
};

export type ReleaseIncident = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  location?: string | null;
  people_involved?: unknown;
  raw_narrative?: string | null;
  neutral_summary?: string | null;
  ai_analysis?: unknown;
  evidence_items?: ReleaseEvidenceItem[] | null;
};

export type ReleaseCase = {
  id: string;
  title: string;
  category: string;
  description?: string | null;
};

export type ExportReadinessModel = {
  caseTitle: string;
  incidentCount: number;
  evidenceCount: number;
  completionScore: number;
  missingDocumentation: string[];
  timelineGapCount: number;
  statementDifferenceCount: number;
  selectedSections: ExportSection[];
};

export type NormalizedSubscriptionStatus = {
  planLabel: string;
  statusLabel: string;
  accessLabel: string;
  renewalLabel: string | null;
  hasAccess: boolean;
  unavailable: boolean;
};

export type PremiumGateDecision = {
  allowed: boolean;
  reason: string | null;
  upgradeHref?: string;
};

export type SafeError = {
  title: string;
  message: string;
  retryable: boolean;
};

export type ReleaseChecklistItem = {
  label: string;
  status: "verified" | "not-verified" | "manual";
};

export type SubscriptionInput = BillingSubscription | null | undefined;
