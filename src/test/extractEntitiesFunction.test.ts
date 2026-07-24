import { describe, expect, it, vi, afterEach } from "vitest";
import { createExtractEntitiesHandler, type SupabaseLikeClient } from "../../supabase/functions/extract-entities/handler.ts";
import { runEntityExtractionProvider } from "../../supabase/functions/extract-entities/provider.ts";
import {
  buildIncidentSource,
  DEFAULT_MAX_AI_CHARS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  validateAiExtractionOutput,
} from "../../supabase/functions/extract-entities/validation.ts";
import type { EvidenceMetadataRow, IncidentRow, ProviderConfig, SafeLogFields } from "../../supabase/functions/extract-entities/types.ts";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const CASE_ID = "33333333-3333-4333-8333-333333333333";
const INCIDENT_ID = "44444444-4444-4444-8444-444444444444";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const providerConfig: ProviderConfig = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
  timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
  maxAiChars: DEFAULT_MAX_AI_CHARS,
};

const incident: IncidentRow = {
  id: INCIDENT_ID,
  case_id: CASE_ID,
  user_id: USER_ID,
  title: "Lincoln Elementary meeting",
  raw_narrative: "John Smith met Maria Garcia at Lincoln Elementary. Contact was jane@example.com.",
  neutral_summary: "John Smith and Maria Garcia were mentioned together.",
  emotional_language_removed: "John Smith met Maria Garcia at Lincoln Elementary.",
  location: "Lincoln Elementary",
  people_involved: ["John Smith", "Maria Garcia"],
  tags: ["school", "meeting"],
  occurred_at: "2026-07-22T10:00:00Z",
  created_at: "2026-07-22T11:00:00Z",
};

const evidence: EvidenceMetadataRow[] = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    type: "document",
    filename: "note.txt",
    description: "Receipt mentioned Lincoln Elementary.",
    created_at: "2026-07-22T12:00:00Z",
  },
];

class MockQueryBuilder {
  private filters: Record<string, unknown> = {};

  constructor(private table: string, private fixtures: MockFixtures) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }

  order() {
    return this;
  }

  limit() {
    return this;
  }

  async maybeSingle() {
    const rows = this.getRows();
    return { data: rows[0] ?? null, error: this.fixtures.queryError ?? null };
  }

  then(resolve: (value: { data: unknown[]; error: unknown }) => void) {
    resolve({ data: this.getRows(), error: this.fixtures.queryError ?? null });
  }

  private getRows() {
    if (this.table === "cases") {
      return this.fixtures.caseRow && this.fixtures.caseRow.id === this.filters.id ? [this.fixtures.caseRow] : [];
    }
    if (this.table === "incidents") {
      return this.fixtures.incidentRow
        && this.fixtures.incidentRow.id === this.filters.id
        && this.fixtures.incidentRow.case_id === this.filters.case_id
        && this.fixtures.incidentRow.user_id === this.filters.user_id
        ? [this.fixtures.incidentRow]
        : [];
    }
    if (this.table === "evidence_items") {
      return this.fixtures.evidenceRows.filter((row) => row.incident_id === this.filters.incident_id || this.filters.incident_id === undefined);
    }
    return [];
  }
}

type MockFixtures = {
  user: { id: string } | null;
  authError?: unknown;
  caseRow: { id: string; user_id: string } | null;
  incidentRow: IncidentRow | null;
  evidenceRows: Array<EvidenceMetadataRow & { incident_id?: string; user_id?: string }>;
  queryError?: unknown;
  rpcError?: unknown;
  rpcData?: Record<string, number>;
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>;
};

function createMockClient(overrides: Partial<MockFixtures> = {}): SupabaseLikeClient & { fixtures: MockFixtures } {
  const fixtures: MockFixtures = {
    user: { id: USER_ID },
    caseRow: { id: CASE_ID, user_id: USER_ID },
    incidentRow: incident,
    evidenceRows: evidence.map((row) => ({ ...row, incident_id: INCIDENT_ID, user_id: USER_ID })),
    rpcData: { entity_count: 2, mention_count: 2, relationship_count: 1, deleted_orphan_count: 0 },
    rpcCalls: [],
    ...overrides,
  };

  return {
    fixtures,
    auth: {
      getUser: async () => ({ data: { user: fixtures.user }, error: fixtures.authError }),
    },
    from: (table: string) => new MockQueryBuilder(table, fixtures),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      fixtures.rpcCalls.push({ fn, args });
      return { data: fixtures.rpcData ?? null, error: fixtures.rpcError ?? null };
    },
  };
}

function makeRequest(body: unknown, authorization = "Bearer valid-token") {
  return new Request("https://example.test/extract-entities", {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return await response.json() as Record<string, unknown>;
}

function createHandler(input: {
  client?: ReturnType<typeof createMockClient>;
  fetchFn?: typeof fetch;
  logger?: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  config?: Partial<ProviderConfig>;
} = {}) {
  const client = input.client ?? createMockClient();
  return {
    client,
    handler: createExtractEntitiesHandler({
      corsHeaders,
      providerConfig: { ...providerConfig, ...(input.config ?? {}) },
      createUserClient: () => client,
      fetchFn: input.fetchFn,
      logger: input.logger,
      now: () => 1000,
    }),
  };
}

function providerResponse(content: string) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("extract-entities request and auth handling", () => {
  it("OPTIONS returns the expected CORS response", async () => {
    const { handler } = createHandler();
    const response = await handler(new Request("https://example.test", { method: "OPTIONS" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(await response.text()).toBe("ok");
  });

  it("missing auth returns 401", async () => {
    const { handler } = createHandler();
    const response = await handler(new Request("https://example.test", { method: "POST", body: "{}" }));
    expect(response.status).toBe(401);
    expect(await readJson(response)).toMatchObject({ status: "error", error: { code: "UNAUTHORIZED" } });
  });

  it("invalid token returns 401", async () => {
    const client = createMockClient({ user: null, authError: new Error("bad jwt") });
    const { handler } = createHandler({ client });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    expect(response.status).toBe(401);
  });

  it("malformed JSON returns 400", async () => {
    const { handler } = createHandler();
    const response = await handler(makeRequest("{"));
    expect(response.status).toBe(400);
    expect(await readJson(response)).toMatchObject({ status: "error", error: { code: "INVALID_REQUEST" } });
  });

  it("invalid UUID returns 400", async () => {
    const { handler } = createHandler();
    const response = await handler(makeRequest({ caseId: "not-a-uuid", incidentId: INCIDENT_ID }));
    expect(response.status).toBe(400);
  });

  it("rejects request bodies that include source text or unexpected fields", async () => {
    const client = createMockClient();
    const { handler } = createHandler({ client });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID, rawNarrative: "do not trust browser text" }));
    expect(response.status).toBe(400);
    expect(client.fixtures.rpcCalls).toHaveLength(0);
  });

  it("case ownership is enforced", async () => {
    const client = createMockClient({ caseRow: { id: CASE_ID, user_id: OTHER_USER_ID } });
    const { handler } = createHandler({ client });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    expect(response.status).toBe(403);
    expect(client.fixtures.rpcCalls).toHaveLength(0);
  });

  it("incident must belong to the supplied case", async () => {
    const client = createMockClient({ incidentRow: { ...incident, case_id: "66666666-6666-4666-8666-666666666666" } });
    const { handler } = createHandler({ client });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    expect(response.status).toBe(404);
    expect(client.fixtures.rpcCalls).toHaveLength(0);
  });
});

describe("extract-entities AI output validation", () => {
  const source = buildIncidentSource(incident, evidence);

  it("ignores unsupported types and empty names", () => {
    const result = validateAiExtractionOutput({
      entities: [
        { type: "email", canonicalName: "jane@example.com", matchedText: "jane@example.com", sourceField: "raw_narrative", confidence: "high", aliases: [] },
        { type: "person", canonicalName: "", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "high", aliases: [] },
      ],
      relationships: [],
    }, source, incident.occurred_at);
    expect(result.entities).toHaveLength(0);
    expect(result.warnings).toContain("ai_entity_unsupported_type");
  });

  it("rejects pronoun-only people and generic role-only people", () => {
    const result = validateAiExtractionOutput({
      entities: [
        { type: "person", canonicalName: "they", matchedText: "they", sourceField: "raw_narrative", confidence: "high", aliases: [] },
        { type: "person", canonicalName: "teacher", matchedText: "teacher", sourceField: "raw_narrative", confidence: "high", aliases: [] },
      ],
      relationships: [],
    }, buildIncidentSource({ ...incident, raw_narrative: "they talked to the teacher" }), incident.occurred_at);
    expect(result.entities).toHaveLength(0);
    expect(result.warnings).toContain("ai_entity_role_or_pronoun_rejected");
  });

  it("ignores matchedText that is not present in the declared source field", () => {
    const result = validateAiExtractionOutput({
      entities: [{ type: "person", canonicalName: "Hidden Name", matchedText: "Hidden Name", sourceField: "raw_narrative", confidence: "high", aliases: [] }],
      relationships: [],
    }, source, incident.occurred_at);
    expect(result.entities).toHaveLength(0);
    expect(result.warnings).toContain("ai_entity_match_not_in_source");
  });

  it("ignores invalid confidence values and limits excessive aliases", () => {
    const invalid = validateAiExtractionOutput({
      entities: [{ type: "person", canonicalName: "John Smith", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "certain", aliases: [] }],
      relationships: [],
    }, source, incident.occurred_at);
    expect(invalid.entities).toHaveLength(0);

    const aliases = Array.from({ length: 20 }, (_, index) => `Alias ${index}`);
    const limited = validateAiExtractionOutput({
      entities: [{ type: "person", canonicalName: "John Smith", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "high", aliases }],
      relationships: [],
    }, source, incident.occurred_at);
    expect(limited.entities[0].aliases).toHaveLength(8);
  });

  it("ignores unsupported, unresolved, and self relationships", () => {
    const result = validateAiExtractionOutput({
      entities: [
        { type: "person", canonicalName: "John Smith", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "high", aliases: [] },
      ],
      relationships: [
        { sourceName: "John Smith", sourceType: "person", targetName: "John Smith", targetType: "person", relationshipType: "mentioned_with", confidence: "medium" },
        { sourceName: "John Smith", sourceType: "person", targetName: "Missing Org", targetType: "organization", relationshipType: "mentioned_with", confidence: "medium" },
        { sourceName: "John Smith", sourceType: "person", targetName: "Missing Org", targetType: "organization", relationshipType: "accused", confidence: "medium" },
      ],
    }, source, incident.occurred_at);
    expect(result.relationships).toHaveLength(0);
    expect(result.warnings).toContain("ai_relationship_self_rejected");
    expect(result.warnings).toContain("ai_relationship_unresolved_endpoint");
    expect(result.warnings).toContain("ai_relationship_rejected");
  });

  it("deduplicates equivalent relationships", () => {
    const result = validateAiExtractionOutput({
      entities: [
        { type: "person", canonicalName: "John Smith", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "high", aliases: [] },
        { type: "school", canonicalName: "Lincoln Elementary", matchedText: "Lincoln Elementary", sourceField: "raw_narrative", confidence: "high", aliases: [] },
      ],
      relationships: [
        { sourceName: "John Smith", sourceType: "person", targetName: "Lincoln Elementary", targetType: "school", relationshipType: "mentioned_with", confidence: "medium" },
        { sourceName: "John Smith", sourceType: "person", targetName: "Lincoln Elementary", targetType: "school", relationshipType: "mentioned_with", confidence: "medium" },
      ],
    }, source, incident.occurred_at);
    expect(result.relationships).toHaveLength(1);
  });
});

describe("extract-entities provider behavior", () => {
  const source = buildIncidentSource(incident, evidence);
  const configured = { ...providerConfig, apiKey: "test-key", timeoutMs: 25 };

  it("timeout returns deterministic fallback status without throwing", async () => {
    vi.useFakeTimers();
    const fetchFn = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }));
    const pending = runEntityExtractionProvider({ config: configured, source, occurredAt: incident.occurred_at, fetchFn });
    await vi.advanceTimersByTimeAsync(25);
    const result = await pending;
    expect(result.status).toBe("timeout");
    expect(result.entities).toHaveLength(0);
  });

  it("network failure and non-2xx return deterministic fallback statuses", async () => {
    const network = await runEntityExtractionProvider({
      config: configured,
      source,
      occurredAt: incident.occurred_at,
      fetchFn: vi.fn(async () => { throw new Error("DNS failed with source text hidden"); }),
    });
    expect(network.status).toBe("unavailable");

    const non2xx = await runEntityExtractionProvider({
      config: configured,
      source,
      occurredAt: incident.occurred_at,
      fetchFn: vi.fn(async () => new Response("raw provider body", { status: 500 })),
    });
    expect(non2xx.status).toBe("unavailable");
    expect(non2xx.warnings).toContain("provider_non_2xx");
  });

  it("invalid JSON returns invalid_response", async () => {
    const result = await runEntityExtractionProvider({
      config: configured,
      source,
      occurredAt: incident.occurred_at,
      fetchFn: vi.fn(async () => new Response("not-json", { status: 200 })),
    });
    expect(result.status).toBe("invalid_response");
    expect(result.entities).toHaveLength(0);
  });

  it("markdown JSON can be safely parsed", async () => {
    const content = "```json\n{\"entities\":[{\"type\":\"person\",\"canonicalName\":\"John Smith\",\"matchedText\":\"John Smith\",\"sourceField\":\"raw_narrative\",\"confidence\":\"high\",\"aliases\":[\"John\"]}],\"relationships\":[]}\n```";
    const result = await runEntityExtractionProvider({
      config: configured,
      source,
      occurredAt: incident.occurred_at,
      fetchFn: vi.fn(async () => providerResponse(content)),
    });
    expect(result.status).toBe("success");
    expect(result.entities).toHaveLength(1);
  });
});

describe("extract-entities persistence and privacy", () => {
  it("uses the exact Checkpoint 2A RPC arguments and maps counts", async () => {
    const content = JSON.stringify({
      entities: [
        { type: "person", canonicalName: "John Smith", matchedText: "John Smith", sourceField: "raw_narrative", confidence: "high", aliases: ["John"] },
        { type: "school", canonicalName: "Lincoln Elementary", matchedText: "Lincoln Elementary", sourceField: "raw_narrative", confidence: "medium", aliases: [] },
      ],
      relationships: [
        { sourceName: "John Smith", sourceType: "person", targetName: "Lincoln Elementary", targetType: "school", relationshipType: "mentioned_with", confidence: "medium" },
      ],
    });
    const client = createMockClient({ rpcData: { entity_count: 3, mention_count: 3, relationship_count: 1, deleted_orphan_count: 0 } });
    const { handler } = createHandler({
      client,
      config: { apiKey: "test-key" },
      fetchFn: vi.fn(async () => providerResponse(content)),
    });

    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    const json = await readJson(response);
    expect(response.status).toBe(200);
    expect(json).toMatchObject({
      status: "success",
      deterministicCount: 1,
      aiCount: 2,
      savedEntityCount: 3,
      savedMentionCount: 3,
      savedRelationshipCount: 1,
      providerStatus: "success",
    });
    expect(client.fixtures.rpcCalls[0].fn).toBe("replace_incident_entity_extraction");
    expect(client.fixtures.rpcCalls[0].args).toMatchObject({
      p_case_id: CASE_ID,
      p_incident_id: INCIDENT_ID,
    });
    expect(client.fixtures.rpcCalls[0].args).toHaveProperty("p_entities");
    expect(client.fixtures.rpcCalls[0].args).toHaveProperty("p_relationships");
  });

  it("RPC error returns a safe 500 response", async () => {
    const client = createMockClient({ rpcError: new Error("duplicate key value violates private_table") });
    const { handler } = createHandler({ client });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    const json = await readJson(response);
    expect(response.status).toBe(500);
    expect(json).toMatchObject({ status: "error", error: { code: "PERSISTENCE_FAILED", message: "Entity extraction could not be saved." } });
    expect(JSON.stringify(json)).not.toContain("private_table");
  });

  it("provider failure still calls RPC with deterministic candidates", async () => {
    const client = createMockClient();
    const { handler } = createHandler({
      client,
      config: { apiKey: "test-key" },
      fetchFn: vi.fn(async () => { throw new Error("network down"); }),
    });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    const json = await readJson(response);
    expect(response.status).toBe(200);
    expect(json.providerStatus).toBe("unavailable");
    expect(client.fixtures.rpcCalls).toHaveLength(1);
    expect(client.fixtures.rpcCalls[0].args.p_entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "email", canonicalName: "jane@example.com" }),
    ]));
  });

  it("empty valid provider output persists deterministic candidates", async () => {
    const client = createMockClient();
    const { handler } = createHandler({
      client,
      config: { apiKey: "test-key" },
      fetchFn: vi.fn(async () => providerResponse(JSON.stringify({ entities: [], relationships: [] }))),
    });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    const json = await readJson(response);
    expect(response.status).toBe(200);
    expect(json.aiCount).toBe(0);
    expect(client.fixtures.rpcCalls[0].args.p_entities).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "email" }),
    ]));
  });

  it("logs and responses do not contain source text or raw provider output", async () => {
    const logger = { info: vi.fn(), error: vi.fn() };
    const rawProviderText = "raw provider body with John Smith and jane@example.com";
    const { handler } = createHandler({
      logger,
      config: { apiKey: "test-key" },
      fetchFn: vi.fn(async () => new Response(rawProviderText, { status: 500 })),
    });
    const response = await handler(makeRequest({ caseId: CASE_ID, incidentId: INCIDENT_ID }));
    const responseText = await response.text();
    const logged = JSON.stringify([...logger.info.mock.calls, ...logger.error.mock.calls]);

    expect(responseText).not.toContain(incident.raw_narrative);
    expect(responseText).not.toContain(rawProviderText);
    expect(responseText).not.toContain("jane@example.com");
    expect(logged).not.toContain(incident.raw_narrative);
    expect(logged).not.toContain(rawProviderText);
    expect(logged).not.toContain("jane@example.com");
  });
});
