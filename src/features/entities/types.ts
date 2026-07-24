export const ENTITY_TYPES = [
  "person",
  "location",
  "organization",
  "school",
  "address",
  "phone",
  "email",
  "url",
  "vehicle",
  "date",
  "court",
  "other",
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];

export type EntityConfidence = "high" | "medium" | "low";

export type JsonObject = Record<string, unknown>;

export type CaseEntityRow = {
  id: string;
  user_id: string;
  case_id: string;
  entity_type: EntityType;
  canonical_name: string;
  normalized_name: string;
  aliases: string[];
  mention_count: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
  metadata: JsonObject;
  created_at: string;
  updated_at: string;
};

export type EntityMentionRow = {
  id: string;
  user_id: string;
  case_id: string;
  entity_id: string;
  incident_id: string;
  evidence_item_id: string | null;
  source_field: string | null;
  matched_text: string;
  context_excerpt: string | null;
  confidence: EntityConfidence | null;
  occurred_at: string | null;
  created_at: string;
};

export type EntityRelationshipRow = {
  id: string;
  user_id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  mention_count: number;
  confidence: EntityConfidence | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseEntity = {
  id: string;
  userId: string;
  caseId: string;
  entityType: EntityType;
  canonicalName: string;
  normalizedName: string;
  aliases: string[];
  mentionCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

export type EntityMention = {
  id: string;
  userId: string;
  caseId: string;
  entityId: string;
  incidentId: string;
  evidenceItemId: string | null;
  sourceField: string | null;
  matchedText: string;
  contextExcerpt: string | null;
  confidence: EntityConfidence | null;
  occurredAt: string | null;
  createdAt: string;
};

export type EntityRelationship = {
  id: string;
  userId: string;
  caseId: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  mentionCount: number;
  confidence: EntityConfidence | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExtractedEntityCandidate = {
  type: EntityType;
  canonicalName: string;
  normalizedName: string;
  matchedText: string;
  sourceField: string;
  contextExcerpt: string;
  confidence: EntityConfidence;
};

export type DeterministicExtractionInput = {
  title?: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  occurredAt?: string | null;
};

export type EntityExtractionResult = {
  candidates: ExtractedEntityCandidate[];
  deterministicCount: number;
  errors: string[];
};

export type EntityOverviewMetrics = {
  totalEntities: number;
  people: number;
  locations: number;
  organizations: number;
  schools: number;
  courts: number;
  contactDetails: number;
  urls: number;
  totalMentions: number;
};

export type EntityFilterState = {
  entityType: EntityType | "all";
  search: string;
  minimumMentionCount: number;
  startDate: string;
  endDate: string;
  evidenceLinkedOnly: boolean;
};
