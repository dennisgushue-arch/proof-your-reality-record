import type { BoundedIncidentSource, ProviderConfig, ProviderExtractionResult } from "./types.ts";
import { extractFirstJsonObject, validateAiExtractionOutput } from "./validation.ts";

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export const ENTITY_EXTRACTION_SYSTEM_PROMPT = [
  "You extract contextual entities for Proof.",
  "Extract only entities explicitly present in the provided source text.",
  "Do not infer guilt, intent, truthfulness, diagnosis, abuse, or legal conclusions.",
  "Do not treat pronouns as people.",
  "Do not treat generic roles as named entities unless uniquely identified in the text.",
  "Do not invent aliases.",
  "Do not extract emails, phone numbers, URLs, addresses, or dates unless they are necessary as context for an allowed relationship.",
  "Allowed entity types: person, location, organization, school, court, vehicle.",
  "Allowed relationship types: mentioned_with, associated_with, attended, employed_by, located_at, parent_of, child_of, spouse_of, contacted.",
  "Return JSON only with keys entities and relationships.",
  "Return empty arrays when nothing qualifies.",
].join(" ");

export function buildEntityExtractionMessages(source: BoundedIncidentSource) {
  return [
    {
      role: "system",
      content: ENTITY_EXTRACTION_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: JSON.stringify({
        sourceFields: source.suppliedFieldNames,
        text: source.aiText,
        outputShape: {
          entities: [
            {
              type: "person",
              canonicalName: "John Smith",
              matchedText: "John Smith",
              sourceField: "raw_narrative",
              confidence: "high",
              aliases: ["John"],
            },
          ],
          relationships: [
            {
              sourceName: "John Smith",
              sourceType: "person",
              targetName: "Lincoln Elementary",
              targetType: "school",
              relationshipType: "mentioned_with",
              confidence: "medium",
            },
          ],
        },
      }),
    },
  ];
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
    || error instanceof Error && error.name === "AbortError";
}

function getProviderContent(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const root = payload as { choices?: Array<{ message?: { content?: unknown } }> };
  const content = root.choices?.[0]?.message?.content;
  return typeof content === "string" ? content : null;
}

export async function runEntityExtractionProvider(input: {
  config: ProviderConfig;
  source: BoundedIncidentSource;
  occurredAt: string | null;
  fetchFn?: FetchLike;
}): Promise<ProviderExtractionResult> {
  const warnings: string[] = [];
  const fetchFn = input.fetchFn ?? fetch;
  const baseUrl = input.config.baseUrl.replace(/\/$/, "");

  if (!input.config.apiKey) {
    return {
      status: "skipped",
      providerUsed: false,
      entities: [],
      relationships: [],
      warnings: ["provider_not_configured"],
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);

  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.config.apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.config.model,
        temperature: 0.1,
        messages: buildEntityExtractionMessages(input.source),
      }),
    });
  } catch (error) {
    clearTimeout(timeout);
    return {
      status: isAbortError(error) ? "timeout" : "unavailable",
      providerUsed: true,
      entities: [],
      relationships: [],
      warnings: [isAbortError(error) ? "provider_timeout" : "provider_unavailable"],
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return {
      status: "unavailable",
      providerUsed: true,
      entities: [],
      relationships: [],
      warnings: ["provider_non_2xx"],
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      status: "invalid_response",
      providerUsed: true,
      entities: [],
      relationships: [],
      warnings: ["provider_invalid_json"],
    };
  }

  const content = getProviderContent(payload);
  if (!content) {
    return {
      status: "invalid_response",
      providerUsed: true,
      entities: [],
      relationships: [],
      warnings: ["provider_missing_content"],
    };
  }

  let rawOutput: unknown;
  try {
    rawOutput = extractFirstJsonObject(content);
  } catch {
    return {
      status: "invalid_response",
      providerUsed: true,
      entities: [],
      relationships: [],
      warnings: ["provider_output_not_json"],
    };
  }

  const validated = validateAiExtractionOutput(rawOutput, input.source, input.occurredAt);
  warnings.push(...validated.warnings);

  return {
    status: "success",
    providerUsed: true,
    entities: validated.entities,
    relationships: validated.relationships,
    warnings,
  };
}
