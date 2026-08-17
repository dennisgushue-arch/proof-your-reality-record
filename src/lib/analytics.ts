import { z } from "zod";

export const AIAnalysisSchema = z.object({
  neutral_summary: z.string().min(1),
  timeline: z.array(z.string()),
  key_claims: z.array(z.string()),
  contradictions: z.array(z.string()),
  missing_evidence: z.array(z.string()),
  follow_ups: z.array(z.string()),
  emotional_language_removed: z.string(),
  evidence_quality_score: z.number().int().min(0).max(100),
});

export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

export const AnalyzeIncidentRequestSchema = z.object({
  title: z.string().min(1),
  narrative: z.string().min(1),
  occurred_at: z.string().min(1),
  location: z.string().nullable().optional(),
  people: z.array(z.string()).optional(),
});

export type AnalyzeIncidentRequest = z.infer<typeof AnalyzeIncidentRequestSchema>;
