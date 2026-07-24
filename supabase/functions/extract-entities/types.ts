import type { EntityConfidence, EntityType } from "../../../src/features/entities/types.ts";

export type ProviderStatus = "success" | "skipped" | "timeout" | "unavailable" | "invalid_response" | "error";
export type ExtractEntitiesErrorCode = "INVALID_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "PERSISTENCE_FAILED" | "METHOD_NOT_ALLOWED" | "INTERNAL_ERROR";
export type RelationshipType =
  | "mentioned_with"
  | "associated_with"
  | "attended"
  | "employed_by"
  | "located_at"
  | "parent_of"
  | "child_of"
  | "spouse_of"
  | "contacted";

export type ExtractEntitiesRequest = {
  caseId: string;
  incidentId: string;
};

export type ExtractEntitiesSuccessResponse = {
  status: "success";
  caseId: string;
  incidentId: string;
  deterministicCount: number;
  aiCount: number;
  resolvedCandidateCount: number;
  savedEntityCount: number;
  savedMentionCount: number;
  savedRelationshipCount: number;
  providerUsed: boolean;
  providerStatus: ProviderStatus;
  warnings: string[];
};

export type ExtractEntitiesErrorResponse = {
  status: "error";
  error: {
    code: ExtractEntitiesErrorCode;
    message: string;
  };
};

export type IncidentRow = {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  raw_narrative: string;
  neutral_summary: string | null;
  emotional_language_removed: string | null;
  location: string | null;
  people_involved: unknown;
  tags: unknown;
  occurred_at: string;
  created_at: string;
};

export type CaseOwnershipRow = {
  id: string;
  user_id: string;
};

export type EvidenceMetadataRow = {
  id: string;
  type: string;
  filename: string | null;
  description: string | null;
  created_at: string;
};

export type IncidentSourceField = {
  field: string;
  text: string;
};

export type BoundedIncidentSource = {
  fields: IncidentSourceField[];
  fullText: string;
  aiText: string;
  suppliedFieldNames: string[];
  truncated: boolean;
};

export type PersistableEntityCandidate = {
  type: EntityType;
  canonicalName: string;
  normalizedName: string;
  aliases?: string[];
  matchedText: string;
  sourceField: string;
  contextExcerpt: string;
  confidence: EntityConfidence;
  occurredAt: string | null;
  evidenceItemId: null;
  metadata: Record<string, never>;
  source: "deterministic" | "ai";
};

export type PersistableRelationshipCandidate = {
  sourceName: string;
  sourceType: EntityType;
  targetName: string;
  targetType: EntityType;
  relationshipType: RelationshipType;
  confidence: EntityConfidence;
};

export type RpcEntityPayload = {
  type: EntityType;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  matchedText: string;
  sourceField: string;
  contextExcerpt: string;
  confidence: EntityConfidence;
  occurredAt: string | null;
  evidenceItemId: null;
  metadata: Record<string, never>;
};

export type RpcRelationshipPayload = {
  sourceType: EntityType;
  sourceNormalizedName: string;
  targetType: EntityType;
  targetNormalizedName: string;
  relationshipType: RelationshipType;
  confidence: EntityConfidence;
  occurredAt: string | null;
};

export type ProviderExtractionResult = {
  status: ProviderStatus;
  providerUsed: boolean;
  entities: PersistableEntityCandidate[];
  relationships: PersistableRelationshipCandidate[];
  warnings: string[];
};

export type ProviderConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxAiChars: number;
};

export type RpcResult = {
  entity_count?: number;
  mention_count?: number;
  relationship_count?: number;
  deleted_orphan_count?: number;
};

export type SafeLogFields = {
  userId?: string;
  caseId?: string;
  incidentId?: string;
  action: "extract_entities";
  phase: string;
  status: "success" | "error";
  deterministicCount?: number;
  aiCount?: number;
  savedEntityCount?: number;
  savedMentionCount?: number;
  savedRelationshipCount?: number;
  providerStatus?: ProviderStatus;
  errorCategory?: string;
  durationMs?: number;
};
