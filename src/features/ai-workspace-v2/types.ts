import type { Tables } from "@/integrations/supabase/types";
import type { CaseIntelligence } from "@/lib/caseIntelligence";

export type AIWorkspaceCaseRow = Pick<Tables<"cases">, "id" | "title" | "category" | "description" | "updated_at">;

export type AIWorkspaceEvidenceItem = Pick<Tables<"evidence_items">, "id" | "type" | "filename" | "description" | "created_at">;

export type AIWorkspaceIncidentRow = Pick<
  Tables<"incidents">,
  | "id"
  | "case_id"
  | "title"
  | "occurred_at"
  | "location"
  | "people_involved"
  | "tags"
  | "raw_narrative"
  | "neutral_summary"
  | "evidence_quality_score"
  | "ai_analysis"
  | "created_at"
  | "updated_at"
> & {
  evidence_items?: AIWorkspaceEvidenceItem[] | null;
};

export type AIWorkspaceSource = {
  incidentId: string;
  incidentTitle: string;
  occurredAt?: string;
  evidenceId?: string;
  evidenceFilename?: string | null;
  evidenceType?: string | null;
  excerpt?: string;
  href: string;
};

export type AIResponseSource = {
  incidentId: string;
  title: string;
  occurredAt?: string;
};

export type AIResponseFinding = {
  label: string;
  value: string;
  incidentId?: string;
};

export type AIWorkspaceResponse = {
  title: string;
  summary: string;
  findings: AIResponseFinding[];
  recommendations: string[];
  confidence?: "high" | "medium" | "low";
  sources?: AIResponseSource[];
};

export type AIMessageBase = {
  id: string;
  createdAt: string;
};

export type UserMessage = AIMessageBase & {
  role: "user";
  text: string;
};

export type AssistantMessageStatus = "loading" | "complete" | "error";

export type AssistantMessage = AIMessageBase & {
  role: "assistant";
  status: AssistantMessageStatus;
  answer: string;
  title?: string;
  error?: string;
  findings: AIResponseFinding[];
  recommendations: string[];
  sources: AIWorkspaceSource[];
  sourceMode: "sources-cited" | "records-considered" | "none";
  generatedAt?: string;
};

export type AIMessage = UserMessage | AssistantMessage;

export type TimelineGap = {
  id: string;
  startIncidentId: string;
  endIncidentId: string;
  startTitle: string;
  endTitle: string;
  gapStart: string;
  gapEnd: string;
  durationDays: number;
};

export type StatementDifference = {
  id: string;
  incidentId: string;
  incidentTitle: string;
  occurredAt: string;
  firstStatement: string;
  secondStatement?: string;
  explanation: string;
};

export type WorkspaceFinding = {
  id: string;
  category: "timeline-gap" | "statement-difference" | "missing-documentation" | "recurring-person" | "recurring-location" | "recurring-topic" | "evidence-strength" | "next-review";
  title: string;
  description: string;
  incidentId?: string;
  href?: string;
  priority?: "low" | "medium" | "high";
};

export type CaseContextSummary = {
  caseRow: AIWorkspaceCaseRow;
  incidentCount: number;
  evidenceCount: number;
  completionScore: number;
  intelligence: CaseIntelligence;
  lastUpdatedLabel: string;
  timelineGaps: TimelineGap[];
  statementDifferences: StatementDifference[];
  findings: WorkspaceFinding[];
};

export type SuggestedPrompt = {
  id: string;
  label: string;
  prompt: string;
};

export type BriefSectionId = "summary" | "timeline" | "incidents" | "evidence" | "missing" | "differences" | "patterns" | "questions";

export type BriefSection = {
  id: BriefSectionId;
  label: string;
  enabled: boolean;
};

export type BriefDraft = {
  title: string;
  body: string;
  generatedAt: string;
};

export type WorkspaceStatus = "idle" | "loading" | "ready" | "error" | "limit-reached";

export type UsageNoticeState = {
  state: "available" | "limit-reached" | "unavailable";
  message: string;
  upgradeHref?: string;
};
