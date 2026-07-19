import type { Tables } from "@/integrations/supabase/types";

export type CaseRow = Pick<Tables<"cases">, "id" | "title" | "category" | "updated_at"> & {
  incidents?: { count: number }[] | null;
};

export type EvidenceItemRow = Pick<Tables<"evidence_items">, "type" | "filename" | "storage_path">;

export type IncidentRow = Pick<
  Tables<"incidents">,
  | "id"
  | "case_id"
  | "title"
  | "occurred_at"
  | "location"
  | "people_involved"
  | "raw_narrative"
  | "neutral_summary"
  | "evidence_quality_score"
  | "ai_analysis"
> & {
  evidence_items?: EvidenceItemRow[] | null;
};

export type RecommendationCategory =
  | "Highest-impact action"
  | "Evidence opportunity"
  | "Recommended next step"
  | "Start here";

export type RecommendationType =
  | "missing-details"
  | "weak-evidence"
  | "active-case"
  | "start-first-record";

export type DashboardRecommendation = {
  type: RecommendationType;
  category: RecommendationCategory;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  potentialGain: string;
};
