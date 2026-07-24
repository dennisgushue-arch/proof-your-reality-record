import { extractDeterministicEntities } from "../../../src/features/entities/extraction/deterministicExtractors.ts";
import { mergeEntityAliases, normalizeEntityName, resolveEntityCandidates } from "../../../src/features/entities/extraction/entityResolution.ts";
import { ENTITY_TYPES, type EntityConfidence, type EntityType } from "../../../src/features/entities/types.ts";
import type {
  BoundedIncidentSource,
  EvidenceMetadataRow,
  IncidentRow,
  PersistableEntityCandidate,
  PersistableRelationshipCandidate,
  RelationshipType,
  RpcEntityPayload,
  RpcRelationshipPayload,
} from "./types.ts";

export const DEFAULT_MAX_AI_CHARS = 12_000;
export const DEFAULT_PROVIDER_TIMEOUT_MS = 15_000;
export const MAX_NAME_LENGTH = 160;
export const MAX_MATCHED_TEXT_LENGTH = 240;
export const MAX_CONTEXT_LENGTH = 360;
export const MAX_ALIAS_COUNT = 8;
export const MAX_ALIAS_LENGTH = 80;
export const MAX_AI_ENTITIES = 40;
export const MAX_AI_RELATIONSHIPS = 40;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);
const AI_ENTITY_TYPES = new Set<EntityType>(["person", "location", "organization", "school", "court", "vehicle"]);
const CONFIDENCE_VALUES = new Set<EntityConfidence>(["high", "medium", "low"]);
const RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "mentioned_with",
  "associated_with",
  "attended",
  "employed_by",
  "located_at",
  "parent_of",
  "child_of",
  "spouse_of",
  "contacted",
]);
const ROLE_OR_PRONOUN_WORDS = new Set([
  "he",
  "him",
  "his",
  "she",
  "her",
  "hers",
  "they",
  "them",
  "their",
  "theirs",
  "we",
  "us",
  "you",
  "i",
  "me",
  "teacher",
  "officer",
  "manager",
  "parent",
  "child",
  "student",
  "principal",
  "doctor",
  "judge",
  "attorney",
  "lawyer",
]);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function safeTrimmedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || CONTROL_CHARACTER_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function parseStringArray(value: unknown, max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

export function parseJsonStringArray(value: unknown, max = 12): string[] {
  if (Array.isArray(value)) return parseStringArray(value, max);
  return [];
}

function normalizeSourceText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

function sourceContainsMatch(sourceText: string, matchedText: string): boolean {
  return sourceText.toLocaleLowerCase().includes(matchedText.toLocaleLowerCase());
}

function getContextExcerpt(sourceText: string, matchedText: string, radius = 96): string {
  const lower = sourceText.toLocaleLowerCase();
  const match = matchedText.toLocaleLowerCase();
  const index = lower.indexOf(match);
  if (index < 0) return sourceText.slice(0, MAX_CONTEXT_LENGTH);
  return sourceText
    .slice(Math.max(0, index - radius), Math.min(sourceText.length, index + matchedText.length + radius))
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_CONTEXT_LENGTH);
}

export function isRoleOrPronounOnly(value: string): boolean {
  const tokens = normalizeEntityName(value).split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((token) => ROLE_OR_PRONOUN_WORDS.has(token));
}

export function buildIncidentSource(
  incident: IncidentRow,
  evidenceItems: EvidenceMetadataRow[] = [],
  maxAiChars = DEFAULT_MAX_AI_CHARS,
): BoundedIncidentSource {
  const tags = parseJsonStringArray(incident.tags).join(", ");
  const people = parseJsonStringArray(incident.people_involved).join(", ");
  const evidenceDescriptions = evidenceItems
    .map((item) => normalizeSourceText(item.description))
    .filter(Boolean)
    .join("\n");

  const fields = [
    { field: "title", text: normalizeSourceText(incident.title) },
    { field: "raw_narrative", text: normalizeSourceText(incident.raw_narrative) },
    { field: "neutral_summary", text: normalizeSourceText(incident.neutral_summary) },
    { field: "emotional_language_removed", text: normalizeSourceText(incident.emotional_language_removed) },
    { field: "location", text: normalizeSourceText(incident.location) },
    { field: "people_involved", text: people },
    { field: "tags", text: tags },
    { field: "occurred_at", text: normalizeSourceText(incident.occurred_at) },
    { field: "created_at", text: normalizeSourceText(incident.created_at) },
    { field: "evidence_items.description", text: evidenceDescriptions },
  ].filter((entry) => entry.text.length > 0);

  const fullText = fields.map((entry) => `${entry.field}: ${entry.text}`).join("\n");
  const aiText = fullText.length > maxAiChars ? fullText.slice(0, maxAiChars) : fullText;

  return {
    fields,
    fullText,
    aiText,
    suppliedFieldNames: fields.map((entry) => entry.field),
    truncated: fullText.length > maxAiChars,
  };
}

export function runDeterministicExtraction(incident: IncidentRow, source: BoundedIncidentSource): PersistableEntityCandidate[] {
  const evidenceText = source.fields.find((field) => field.field === "evidence_items.description")?.text ?? "";
  const candidates = extractDeterministicEntities({
    title: incident.title,
    description: incident.raw_narrative,
    notes: [incident.neutral_summary, incident.location, evidenceText].filter(Boolean).join("\n"),
    tags: parseJsonStringArray(incident.tags),
    occurredAt: incident.occurred_at,
  });

  return candidates.map((candidate) => {
    let sourceField = candidate.sourceField;
    if (sourceField === "description") sourceField = "raw_narrative";
    if (sourceField === "notes") sourceField = evidenceText && candidate.contextExcerpt && evidenceText.includes(candidate.matchedText)
      ? "evidence_items.description"
      : "neutral_summary";

    return {
      ...candidate,
      sourceField,
      aliases: [],
      occurredAt: incident.occurred_at,
      evidenceItemId: null,
      metadata: {},
      source: "deterministic" as const,
    };
  });
}

export function extractFirstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("empty provider response");

  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const first = candidate.indexOf("{");
    const last = candidate.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(candidate.slice(first, last + 1));
    }
    throw new Error("No valid JSON object found in provider response");
  }
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function sanitizeAliases(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const raw of value) {
    const alias = safeTrimmedString(raw, MAX_ALIAS_LENGTH);
    if (!alias || isRoleOrPronounOnly(alias)) continue;
    const key = normalizeEntityName(alias);
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
    if (aliases.length >= MAX_ALIAS_COUNT) break;
  }
  return aliases;
}

export function validateAiExtractionOutput(raw: unknown, source: BoundedIncidentSource, occurredAt: string | null): {
  entities: PersistableEntityCandidate[];
  relationships: PersistableRelationshipCandidate[];
  warnings: string[];
} {
  const warnings = new Set<string>();
  const obj = readObject(raw);
  if (!obj) {
    return { entities: [], relationships: [], warnings: ["ai_output_invalid_shape"] };
  }

  const rawEntities = Array.isArray(obj.entities) ? obj.entities.slice(0, MAX_AI_ENTITIES) : [];
  const rawRelationships = Array.isArray(obj.relationships) ? obj.relationships.slice(0, MAX_AI_RELATIONSHIPS) : [];
  if (!Array.isArray(obj.entities) || !Array.isArray(obj.relationships)) warnings.add("ai_output_invalid_shape");

  const sourceFieldText = new Map(source.fields.map((field) => [field.field, field.text]));
  const entities: PersistableEntityCandidate[] = [];
  const entityKeys = new Set<string>();

  for (const item of rawEntities) {
    const entity = readObject(item);
    if (!entity) {
      warnings.add("ai_entity_rejected");
      continue;
    }
    const type = safeTrimmedString(entity.type, 40) as EntityType | null;
    if (!type || !ENTITY_TYPE_SET.has(type) || !AI_ENTITY_TYPES.has(type)) {
      warnings.add("ai_entity_unsupported_type");
      continue;
    }
    const canonicalName = safeTrimmedString(entity.canonicalName, MAX_NAME_LENGTH);
    const matchedText = safeTrimmedString(entity.matchedText, MAX_MATCHED_TEXT_LENGTH);
    const sourceField = safeTrimmedString(entity.sourceField, 80);
    const confidence = safeTrimmedString(entity.confidence, 20) as EntityConfidence | null;
    const aliases = sanitizeAliases(entity.aliases);

    if (!canonicalName || !matchedText || !sourceField || !confidence || !CONFIDENCE_VALUES.has(confidence) || aliases === null) {
      warnings.add("ai_entity_rejected");
      continue;
    }
    if (type === "person" && isRoleOrPronounOnly(canonicalName)) {
      warnings.add("ai_entity_role_or_pronoun_rejected");
      continue;
    }
    const sourceText = sourceFieldText.get(sourceField);
    if (!sourceText || !sourceContainsMatch(sourceText, matchedText)) {
      warnings.add("ai_entity_match_not_in_source");
      continue;
    }
    const normalizedName = normalizeEntityName(canonicalName);
    if (!normalizedName || normalizedName.length > MAX_NAME_LENGTH) {
      warnings.add("ai_entity_rejected");
      continue;
    }

    const key = `${type}:${normalizedName}`;
    if (entityKeys.has(key)) continue;
    entityKeys.add(key);
    entities.push({
      type,
      canonicalName,
      normalizedName,
      aliases,
      matchedText,
      sourceField,
      contextExcerpt: getContextExcerpt(sourceText, matchedText),
      confidence,
      occurredAt,
      evidenceItemId: null,
      metadata: {},
      source: "ai",
    });
  }

  const acceptedKeys = new Set(entities.map((entity) => `${entity.type}:${entity.normalizedName}`));
  const relationships: PersistableRelationshipCandidate[] = [];
  const relationshipKeys = new Set<string>();

  for (const item of rawRelationships) {
    const relationship = readObject(item);
    if (!relationship) {
      warnings.add("ai_relationship_rejected");
      continue;
    }
    const sourceType = safeTrimmedString(relationship.sourceType, 40) as EntityType | null;
    const targetType = safeTrimmedString(relationship.targetType, 40) as EntityType | null;
    const sourceName = safeTrimmedString(relationship.sourceName, MAX_NAME_LENGTH);
    const targetName = safeTrimmedString(relationship.targetName, MAX_NAME_LENGTH);
    const relationshipType = safeTrimmedString(relationship.relationshipType, 60) as RelationshipType | null;
    const confidence = safeTrimmedString(relationship.confidence, 20) as EntityConfidence | null;

    if (
      !sourceType || !targetType || !ENTITY_TYPE_SET.has(sourceType) || !ENTITY_TYPE_SET.has(targetType)
      || !sourceName || !targetName || !relationshipType || !RELATIONSHIP_TYPES.has(relationshipType)
      || !confidence || !CONFIDENCE_VALUES.has(confidence)
    ) {
      warnings.add("ai_relationship_rejected");
      continue;
    }
    const sourceNormalized = normalizeEntityName(sourceName);
    const targetNormalized = normalizeEntityName(targetName);
    const sourceKey = `${sourceType}:${sourceNormalized}`;
    const targetKey = `${targetType}:${targetNormalized}`;
    if (sourceKey === targetKey) {
      warnings.add("ai_relationship_self_rejected");
      continue;
    }
    if (!acceptedKeys.has(sourceKey) || !acceptedKeys.has(targetKey)) {
      warnings.add("ai_relationship_unresolved_endpoint");
      continue;
    }
    const key = `${sourceKey}:${targetKey}:${relationshipType}`;
    if (relationshipKeys.has(key)) continue;
    relationshipKeys.add(key);
    relationships.push({
      sourceName,
      sourceType,
      targetName,
      targetType,
      relationshipType,
      confidence,
    });
  }

  return { entities, relationships, warnings: [...warnings] };
}

export function mergeAndResolveCandidates(
  deterministicCandidates: PersistableEntityCandidate[],
  aiCandidates: PersistableEntityCandidate[],
): PersistableEntityCandidate[] {
  const resolved = resolveEntityCandidates([...deterministicCandidates, ...aiCandidates], []);
  return resolved
    .filter((candidate) => !candidate.needsReview)
    .map((candidate) => ({
      ...candidate,
      aliases: mergeEntityAliases(candidate.aliases, [candidate.canonicalName, candidate.matchedText]),
      occurredAt: (candidate as PersistableEntityCandidate).occurredAt ?? null,
      evidenceItemId: null,
      metadata: {},
      source: (candidate as PersistableEntityCandidate).source ?? "ai",
    }));
}

export function resolveRelationshipsForPersistence(
  relationships: PersistableRelationshipCandidate[],
  acceptedEntities: PersistableEntityCandidate[],
  occurredAt: string | null,
): RpcRelationshipPayload[] {
  const entityByKey = new Map(acceptedEntities.map((entity) => [`${entity.type}:${entity.normalizedName}`, entity]));
  const seen = new Set<string>();
  const output: RpcRelationshipPayload[] = [];

  for (const relationship of relationships) {
    const sourceKey = `${relationship.sourceType}:${normalizeEntityName(relationship.sourceName)}`;
    const targetKey = `${relationship.targetType}:${normalizeEntityName(relationship.targetName)}`;
    const source = entityByKey.get(sourceKey);
    const target = entityByKey.get(targetKey);
    if (!source || !target) continue;
    if (source.type === target.type && source.normalizedName === target.normalizedName) continue;
    const key = `${source.type}:${source.normalizedName}:${target.type}:${target.normalizedName}:${relationship.relationshipType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push({
      sourceType: source.type,
      sourceNormalizedName: source.normalizedName,
      targetType: target.type,
      targetNormalizedName: target.normalizedName,
      relationshipType: relationship.relationshipType,
      confidence: relationship.confidence,
      occurredAt,
    });
  }

  return output;
}

export function toRpcEntityPayload(entities: PersistableEntityCandidate[]): RpcEntityPayload[] {
  return entities.map((entity) => ({
    type: entity.type,
    canonicalName: entity.canonicalName.slice(0, MAX_NAME_LENGTH),
    normalizedName: entity.normalizedName,
    aliases: mergeEntityAliases(entity.aliases, [entity.canonicalName]).slice(0, MAX_ALIAS_COUNT),
    matchedText: entity.matchedText.slice(0, MAX_MATCHED_TEXT_LENGTH),
    sourceField: entity.sourceField,
    contextExcerpt: entity.contextExcerpt.slice(0, MAX_CONTEXT_LENGTH),
    confidence: entity.confidence,
    occurredAt: entity.occurredAt,
    evidenceItemId: null,
    metadata: {},
  }));
}
