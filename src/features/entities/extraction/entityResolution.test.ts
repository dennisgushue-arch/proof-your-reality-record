import { describe, expect, it } from "vitest";
import type { EntityResolutionCandidate, ExistingEntityForResolution } from "./entityResolution.ts";
import {
  calculateEntitySimilarity,
  findLikelyExistingEntity,
  mergeEntityAliases,
  normalizeEntityName,
  resolveEntityCandidate,
  resolveEntityCandidates,
} from "./entityResolution.ts";

const johnSmith: ExistingEntityForResolution = {
  id: "entity-1",
  entityType: "person",
  canonicalName: "John Smith",
  normalizedName: "john smith",
  aliases: ["John"],
};

function candidate(overrides: Partial<EntityResolutionCandidate> = {}): EntityResolutionCandidate {
  return {
    type: "person",
    canonicalName: "John Smith",
    normalizedName: "john smith",
    matchedText: "John Smith",
    sourceField: "description",
    contextExcerpt: "John Smith arrived.",
    confidence: "high",
    source: "deterministic",
    ...overrides,
  };
}

describe("entity resolution", () => {
  it("normalizes capitalization, punctuation, and repeated whitespace", () => {
    expect(normalizeEntityName("  JOHN,   SMITH!!  ")).toBe("john smith");
    expect(normalizeEntityName("John\n\tSmith")).toBe("john smith");
  });

  it("merges exact type and normalizedName matches automatically", () => {
    const resolved = resolveEntityCandidate(candidate(), [johnSmith]);

    expect(resolved.resolvedEntityId).toBe("entity-1");
    expect(resolved.needsReview).toBe(false);
  });

  it("merges case and punctuation variants automatically", () => {
    const resolved = resolveEntityCandidate(candidate({ canonicalName: "JOHN, SMITH", normalizedName: "john smith" }), [johnSmith]);

    expect(resolved.resolvedEntityId).toBe("entity-1");
  });

  it("merges whitespace variants automatically", () => {
    const resolved = resolveEntityCandidate(candidate({ canonicalName: "John   Smith", normalizedName: "john   smith" }), [johnSmith]);

    expect(resolved.resolvedEntityId).toBe("entity-1");
    expect(resolved.normalizedName).toBe("john smith");
  });

  it("deduplicates aliases case-insensitively", () => {
    expect(mergeEntityAliases(["John", "john", "Johnny"], [" JOHNNY ", "J. Smith"])).toEqual(["John", "Johnny", "J. Smith"]);
  });

  it("never merges different entity types", () => {
    const existing: ExistingEntityForResolution = { ...johnSmith, entityType: "organization" };
    const resolved = resolveEntityCandidate(candidate(), [existing]);

    expect(resolved.resolvedEntityId).toBeUndefined();
    expect(resolved.matchedExistingEntity).toBeUndefined();
  });

  it("does not merge people on surname alone", () => {
    const resolved = resolveEntityCandidate(candidate({ canonicalName: "Smith", normalizedName: "smith" }), [johnSmith], { similarityThreshold: 0.5 });

    expect(resolved.resolvedEntityId).toBeUndefined();
    expect(resolved.needsReview).toBe(false);
  });

  it("does not auto-merge middle-initial ambiguity", () => {
    const resolved = resolveEntityCandidate(candidate({ canonicalName: "John A. Smith", normalizedName: "john a smith" }), [johnSmith], { similarityThreshold: 0.7 });

    expect(resolved.resolvedEntityId).toBeUndefined();
    expect(resolved.needsReview).toBe(true);
    expect(resolved.reviewReason).toBe("similar_entity_requires_review");
  });

  it("flags fuzzy candidates above threshold for review without silently merging", () => {
    const existing: ExistingEntityForResolution = {
      id: "school-1",
      entityType: "school",
      canonicalName: "Lincoln Elementary",
      normalizedName: "lincoln elementary",
    };
    const result = findLikelyExistingEntity(candidate({
      type: "school",
      canonicalName: "Lincon Elementary",
      normalizedName: "lincon elementary",
    }), [existing], { similarityThreshold: 0.85 });

    expect(calculateEntitySimilarity("Lincon Elementary", "Lincoln Elementary")).toBeGreaterThan(0.85);
    expect(result.entity?.id).toBe("school-1");
    expect(result.needsReview).toBe(true);
  });

  it("preserves deterministic candidates when AI output conflicts", () => {
    const deterministic = candidate({ canonicalName: "John Smith", source: "deterministic", confidence: "high" });
    const ai = candidate({ canonicalName: "Johnny Smith", matchedText: "Johnny Smith", source: "ai", confidence: "medium" });
    const [resolved] = resolveEntityCandidates([deterministic, ai], []);

    expect(resolved.canonicalName).toBe("John Smith");
    expect(resolved.source).toBe("deterministic");
  });

  it("flags role words and pronouns instead of inferring identity", () => {
    const resolved = resolveEntityCandidate(candidate({ canonicalName: "teacher", normalizedName: "teacher", matchedText: "teacher" }), []);

    expect(resolved.needsReview).toBe(true);
    expect(resolved.reviewReason).toBe("role_or_pronoun_only");
  });
});
