import type { Tables } from "@/integrations/supabase/types";
import type { CaseIntelligence } from "@/lib/caseIntelligence";
import type { IncidentCompletion } from "@/lib/evidenceCompletion";

export type CaseDetailCaseRow = Pick<
  Tables<"cases">,
  "id" | "title" | "category" | "description" | "created_at" | "updated_at"
>;

export type CaseDetailEvidenceItemRow = Pick<
  Tables<"evidence_items">,
  "id" | "type" | "filename" | "storage_path" | "description" | "created_at"
>;

export type CaseDetailIncidentRow = Pick<
  Tables<"incidents">,
  | "id"
  | "case_id"
  | "title"
  | "occurred_at"
  | "location"
  | "people_involved"
  | "tags"
  | "neutral_summary"
  | "raw_narrative"
  | "evidence_quality_score"
  | "ai_analysis"
  | "created_at"
  | "updated_at"
> & {
  evidence_items?: CaseDetailEvidenceItemRow[] | null;
};

export type EvidenceTone = "strong" | "developing" | "limited";

export type MissingEvidenceItem = {
  id: string;
  incidentId: string;
  incidentTitle: string;
  label: string;
  description: string;
  severity: "high" | "medium" | "low";
};

export type PatternInsightItem = {
  id: string;
  title: string;
  description: string;
  tone: "positive" | "warning" | "neutral";
  metric: string;
};

export type RecommendedCaseActionModel = {
  type: "record-incident" | "complete-incident" | "add-evidence" | "review-brief";
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export type CaseDetailSummary = {
  incidentCount: number;
  evidenceCount: number;
  peopleCount: number;
  completionPercentage: number;
  caseStatus: "Active" | "Archived";
  lastActivityLabel: string;
};

export type ReplayEventKind = "incident" | "communication" | "evidence" | "incomplete";

export type ReplayEvent = {
  id: string;
  kind: ReplayEventKind;
  incidentId: string;
  occurredAt: string;
  dateLabel: string;
  timeLabel: string;
  title: string;
  category: string;
  description: string;
  location: string | null;
  people: string[];
  evidenceCount: number;
  completionScore: number;
  documentationStrength: number;
};

export type IncidentCompletionById = Record<string, IncidentCompletion>;

export type CaseDetailData = {
  caseRow: CaseDetailCaseRow;
  incidents: CaseDetailIncidentRow[];
  intelligence: CaseIntelligence;
  summary: CaseDetailSummary;
};
