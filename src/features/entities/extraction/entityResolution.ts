import type { EntityConfidence, EntityType, ExtractedEntityCandidate } from "../types.ts";

export type ExistingEntityForResolution = {
  id: string;
  entityType: EntityType;
  canonicalName: string;
  normalizedName: string;
  aliases?: string[];
};

export type EntityResolutionCandidate = ExtractedEntityCandidate & {
  aliases?: string[];
  metadata?: Record<string, unknown>;
  source?: "deterministic" | "ai";
};

export type ResolvedEntityCandidate = EntityResolutionCandidate & {
  resolvedEntityId?: string;
  needsReview?: boolean;
  reviewReason?: string;
  matchedExistingEntity?: ExistingEntityForResolution;
};

export type ResolveEntityCandidateOptions = {
  similarityThreshold?: number;
};

const DEFAULT_SIMILARITY_THRESHOLD = 0.86;
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

export function normalizeEntityName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9@._%+/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactName(value: string): string {
  return normalizeEntityName(value).replace(/[^a-z0-9]/g, "");
}

function tokenizeName(value: string): string[] {
  return normalizeEntityName(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);
}

function levenshteinDistance(left: string, right: string): number {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

export function calculateEntitySimilarity(left: string, right: string): number {
  const normalizedLeft = compactName(left);
  const normalizedRight = compactName(right);
  if (!normalizedLeft && !normalizedRight) return 1;
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;

  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  const distance = levenshteinDistance(normalizedLeft, normalizedRight);
  return Math.max(0, 1 - distance / maxLength);
}

function isRoleOrPronounOnly(value: string): boolean {
  const tokens = tokenizeName(value);
  return tokens.length > 0 && tokens.every((token) => ROLE_OR_PRONOUN_WORDS.has(token));
}

function isSurnameOnlyPersonMatch(candidate: EntityResolutionCandidate, existing: ExistingEntityForResolution): boolean {
  if (candidate.type !== "person" || existing.entityType !== "person") return false;
  const candidateTokens = tokenizeName(candidate.normalizedName || candidate.canonicalName);
  const existingTokens = tokenizeName(existing.normalizedName || existing.canonicalName);
  if (candidateTokens.length !== 1 || existingTokens.length < 2) return false;
  return candidateTokens[0] === existingTokens[existingTokens.length - 1];
}

function hasMiddleInitialAmbiguity(candidate: EntityResolutionCandidate, existing: ExistingEntityForResolution): boolean {
  if (candidate.type !== "person" || existing.entityType !== "person") return false;
  const candidateTokens = tokenizeName(candidate.canonicalName || candidate.normalizedName);
  const existingTokens = tokenizeName(existing.canonicalName || existing.normalizedName);
  if (candidateTokens.length < 2 || existingTokens.length < 2) return false;

  const sameFirstLast = candidateTokens[0] === existingTokens[0]
    && candidateTokens[candidateTokens.length - 1] === existingTokens[existingTokens.length - 1];
  if (!sameFirstLast) return false;
  return candidateTokens.length !== existingTokens.length;
}

export function mergeEntityAliases(...aliasGroups: Array<readonly string[] | undefined>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const aliases of aliasGroups) {
    for (const alias of aliases ?? []) {
      const trimmed = alias.trim();
      if (!trimmed) continue;
      const key = normalizeEntityName(trimmed);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(trimmed);
    }
  }

  return merged;
}

export function findLikelyExistingEntity(
  candidate: EntityResolutionCandidate,
  existingEntities: ExistingEntityForResolution[],
  options: ResolveEntityCandidateOptions = {},
): { entity?: ExistingEntityForResolution; similarity: number; needsReview: boolean; reason?: string } {
  const threshold = options.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD;
  const candidateNormalized = normalizeEntityName(candidate.normalizedName || candidate.canonicalName);

  for (const existing of existingEntities) {
    if (existing.entityType !== candidate.type) continue;
    const existingNormalized = normalizeEntityName(existing.normalizedName || existing.canonicalName);
    if (candidateNormalized && candidateNormalized === existingNormalized) {
      return { entity: existing, similarity: 1, needsReview: false };
    }
    if (compactName(candidateNormalized) && compactName(candidateNormalized) === compactName(existingNormalized)) {
      return { entity: existing, similarity: 1, needsReview: false };
    }
  }

  let best: ExistingEntityForResolution | undefined;
  let bestSimilarity = 0;
  for (const existing of existingEntities) {
    if (existing.entityType !== candidate.type) continue;
    if (isSurnameOnlyPersonMatch(candidate, existing)) continue;
    if (hasMiddleInitialAmbiguity(candidate, existing)) {
      const similarity = calculateEntitySimilarity(candidate.canonicalName, existing.canonicalName);
      if (similarity > bestSimilarity) {
        best = existing;
        bestSimilarity = similarity;
      }
      continue;
    }
    const similarity = calculateEntitySimilarity(candidate.normalizedName || candidate.canonicalName, existing.normalizedName || existing.canonicalName);
    if (similarity > bestSimilarity) {
      best = existing;
      bestSimilarity = similarity;
    }
  }

  if (best && bestSimilarity >= threshold) {
    return { entity: best, similarity: bestSimilarity, needsReview: true, reason: "similar_entity_requires_review" };
  }

  return { similarity: bestSimilarity, needsReview: false };
}

export function resolveEntityCandidate(
  candidate: EntityResolutionCandidate,
  existingEntities: ExistingEntityForResolution[],
  options: ResolveEntityCandidateOptions = {},
): ResolvedEntityCandidate {
  const normalizedName = normalizeEntityName(candidate.normalizedName || candidate.canonicalName);
  const aliases = mergeEntityAliases(candidate.aliases, [candidate.canonicalName, candidate.matchedText]);

  if (candidate.type === "person" && isRoleOrPronounOnly(normalizedName)) {
    return {
      ...candidate,
      normalizedName,
      aliases,
      needsReview: true,
      reviewReason: "role_or_pronoun_only",
    };
  }

  const match = findLikelyExistingEntity({ ...candidate, normalizedName }, existingEntities, options);
  if (match.entity && !match.needsReview) {
    return {
      ...candidate,
      normalizedName,
      aliases: mergeEntityAliases(match.entity.aliases, aliases),
      resolvedEntityId: match.entity.id,
      matchedExistingEntity: match.entity,
      needsReview: false,
    };
  }

  if (match.entity && match.needsReview) {
    return {
      ...candidate,
      normalizedName,
      aliases,
      matchedExistingEntity: match.entity,
      needsReview: true,
      reviewReason: match.reason ?? "similar_entity_requires_review",
    };
  }

  return {
    ...candidate,
    normalizedName,
    aliases,
    needsReview: false,
  };
}

export function resolveEntityCandidates(
  candidates: EntityResolutionCandidate[],
  existingEntities: ExistingEntityForResolution[],
  options: ResolveEntityCandidateOptions = {},
): ResolvedEntityCandidate[] {
  const byIdentity = new Map<string, EntityResolutionCandidate>();

  for (const candidate of candidates) {
    const normalizedName = normalizeEntityName(candidate.normalizedName || candidate.canonicalName);
    const key = `${candidate.type}:${normalizedName}`;
    const existing = byIdentity.get(key);
    if (!existing) {
      byIdentity.set(key, { ...candidate, normalizedName });
      continue;
    }

    const deterministicWins = existing.source === "deterministic" || candidate.source !== "deterministic";
    const base = deterministicWins ? existing : candidate;
    byIdentity.set(key, {
      ...base,
      normalizedName,
      aliases: mergeEntityAliases(existing.aliases, candidate.aliases, [existing.canonicalName, candidate.canonicalName]),
      metadata: {
        ...(candidate.metadata ?? {}),
        ...(existing.metadata ?? {}),
      },
      confidence: chooseHigherConfidence(existing.confidence, candidate.confidence),
    });
  }

  return [...byIdentity.values()].map((candidate) => resolveEntityCandidate(candidate, existingEntities, options));
}

function chooseHigherConfidence(left: EntityConfidence, right: EntityConfidence): EntityConfidence {
  const rank: Record<EntityConfidence, number> = { low: 0, medium: 1, high: 2 };
  return rank[left] >= rank[right] ? left : right;
}
