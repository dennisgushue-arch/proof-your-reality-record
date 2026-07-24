import type {
  CaseOwnershipRow,
  EvidenceMetadataRow,
  ExtractEntitiesErrorCode,
  ExtractEntitiesErrorResponse,
  ExtractEntitiesRequest,
  ExtractEntitiesSuccessResponse,
  IncidentRow,
  ProviderConfig,
  RpcResult,
  SafeLogFields,
} from "./types.ts";
import { runEntityExtractionProvider, type FetchLike } from "./provider.ts";
import {
  buildIncidentSource,
  DEFAULT_MAX_AI_CHARS,
  DEFAULT_PROVIDER_TIMEOUT_MS,
  isUuid,
  mergeAndResolveCandidates,
  resolveRelationshipsForPersistence,
  runDeterministicExtraction,
  toRpcEntityPayload,
} from "./validation.ts";

const JSON_HEADERS = { "Content-Type": "application/json" };

export type SupabaseUser = { id: string };
export type SupabaseLikeClient = {
  auth: {
    getUser: () => Promise<{ data: { user: SupabaseUser | null }; error?: unknown }>;
  };
  from: (table: string) => any;
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error?: unknown }>;
};

export type SafeLogger = {
  info: (message: string, fields: SafeLogFields) => void;
  error: (message: string, fields: SafeLogFields) => void;
};

export type ExtractEntitiesHandlerDependencies = {
  corsHeaders: Record<string, string>;
  createUserClient: (authorizationHeader: string) => SupabaseLikeClient;
  providerConfig: ProviderConfig;
  fetchFn?: FetchLike;
  logger?: SafeLogger;
  now?: () => number;
};

function safeJsonResponse(body: ExtractEntitiesSuccessResponse | ExtractEntitiesErrorResponse, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

function errorResponse(
  code: ExtractEntitiesErrorCode,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
) {
  return safeJsonResponse({ status: "error", error: { code, message } }, status, corsHeaders);
}

function safeLog(logger: SafeLogger | undefined, level: "info" | "error", fields: SafeLogFields) {
  const target = logger ?? console;
  target[level]("extract_entities_event", fields);
}

async function parseRequestJson(req: Request): Promise<ExtractEntitiesRequest | null> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const keys = Object.keys(body);
    if (keys.length !== 2 || !keys.includes("caseId") || !keys.includes("incidentId")) return null;
    const record = body as Partial<ExtractEntitiesRequest>;
    return {
      caseId: typeof record.caseId === "string" ? record.caseId : "",
      incidentId: typeof record.incidentId === "string" ? record.incidentId : "",
    };
  } catch {
    return null;
  }
}

async function fetchCaseOwnership(client: SupabaseLikeClient, caseId: string): Promise<{ data: CaseOwnershipRow | null; error?: unknown }> {
  return await client
    .from("cases")
    .select("id, user_id")
    .eq("id", caseId)
    .maybeSingle();
}

async function fetchIncident(client: SupabaseLikeClient, caseId: string, incidentId: string, userId: string): Promise<{ data: IncidentRow | null; error?: unknown }> {
  return await client
    .from("incidents")
    .select("id, case_id, user_id, title, raw_narrative, neutral_summary, emotional_language_removed, location, people_involved, tags, occurred_at, created_at")
    .eq("id", incidentId)
    .eq("case_id", caseId)
    .eq("user_id", userId)
    .maybeSingle();
}

async function fetchEvidenceMetadata(client: SupabaseLikeClient, incidentId: string, userId: string): Promise<EvidenceMetadataRow[]> {
  const { data, error } = await client
    .from("evidence_items")
    .select("id, type, filename, description, created_at")
    .eq("incident_id", incidentId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(25);

  if (error || !Array.isArray(data)) return [];
  return data as EvidenceMetadataRow[];
}

async function callExtractionRpc(
  client: SupabaseLikeClient,
  args: Record<string, unknown>,
): Promise<{ data: RpcResult | null; error?: unknown }> {
  try {
    const first = await client.rpc("replace_incident_entity_extraction", args);
    return { data: (first.data as RpcResult | null) ?? null, error: first.error };
  } catch (error) {
    try {
      const retry = await client.rpc("replace_incident_entity_extraction", args);
      return { data: (retry.data as RpcResult | null) ?? null, error: retry.error };
    } catch (retryError) {
      return { data: null, error: retryError };
    }
  }
}

export function createExtractEntitiesHandler(deps: ExtractEntitiesHandlerDependencies) {
  return async function handleExtractEntitiesRequest(req: Request): Promise<Response> {
    const startedAt = deps.now?.() ?? Date.now();
    const corsHeaders = deps.corsHeaders;

    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!/^Bearer\s+\S+/i.test(authHeader)) {
      return errorResponse("UNAUTHORIZED", "Missing or invalid authentication.", 401, corsHeaders);
    }

    const body = await parseRequestJson(req);
    if (!body) {
      return errorResponse("INVALID_REQUEST", "Request body must be valid JSON.", 400, corsHeaders);
    }

    if (!isUuid(body.caseId) || !isUuid(body.incidentId)) {
      return errorResponse("INVALID_REQUEST", "caseId and incidentId must be valid UUIDs.", 400, corsHeaders);
    }

    const client = deps.createUserClient(authHeader);
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError || !user) {
      return errorResponse("UNAUTHORIZED", "Missing or invalid authentication.", 401, corsHeaders);
    }

    const baseLogFields = {
      userId: user.id,
      caseId: body.caseId,
      incidentId: body.incidentId,
      action: "extract_entities" as const,
    };

    const { data: caseRow, error: caseError } = await fetchCaseOwnership(client, body.caseId);
    if (caseError) {
      safeLog(deps.logger, "error", { ...baseLogFields, phase: "case_lookup", status: "error", errorCategory: "case_lookup_failed" });
      return errorResponse("INTERNAL_ERROR", "Unable to verify case access.", 500, corsHeaders);
    }
    if (!caseRow || caseRow.user_id !== user.id) {
      safeLog(deps.logger, "error", { ...baseLogFields, phase: "case_lookup", status: "error", errorCategory: "case_forbidden" });
      return errorResponse("FORBIDDEN", "Case not found or access is not allowed.", 403, corsHeaders);
    }

    const { data: incident, error: incidentError } = await fetchIncident(client, body.caseId, body.incidentId, user.id);
    if (incidentError) {
      safeLog(deps.logger, "error", { ...baseLogFields, phase: "incident_lookup", status: "error", errorCategory: "incident_lookup_failed" });
      return errorResponse("INTERNAL_ERROR", "Unable to load incident source data.", 500, corsHeaders);
    }
    if (!incident) {
      safeLog(deps.logger, "error", { ...baseLogFields, phase: "incident_lookup", status: "error", errorCategory: "incident_not_found" });
      return errorResponse("NOT_FOUND", "Incident not found for the supplied case.", 404, corsHeaders);
    }

    const evidenceMetadata = await fetchEvidenceMetadata(client, body.incidentId, user.id);
    const source = buildIncidentSource(incident, evidenceMetadata, deps.providerConfig.maxAiChars || DEFAULT_MAX_AI_CHARS);
    const warnings = new Set<string>();
    if (source.truncated) warnings.add("ai_input_truncated");

    const deterministicCandidates = runDeterministicExtraction(incident, source);
    const provider = await runEntityExtractionProvider({
      config: {
        ...deps.providerConfig,
        timeoutMs: deps.providerConfig.timeoutMs || DEFAULT_PROVIDER_TIMEOUT_MS,
        maxAiChars: deps.providerConfig.maxAiChars || DEFAULT_MAX_AI_CHARS,
      },
      source,
      occurredAt: incident.occurred_at,
      fetchFn: deps.fetchFn,
    });
    for (const warning of provider.warnings) warnings.add(warning);

    const acceptedCandidates = mergeAndResolveCandidates(deterministicCandidates, provider.entities);
    const entityPayload = toRpcEntityPayload(acceptedCandidates);
    const relationshipPayload = resolveRelationshipsForPersistence(provider.relationships, acceptedCandidates, incident.occurred_at);

    const rpcArgs = {
      p_case_id: body.caseId,
      p_incident_id: body.incidentId,
      p_entities: entityPayload,
      p_relationships: relationshipPayload,
    };

    const { data: rpcData, error: rpcError } = await callExtractionRpc(client, rpcArgs);
    if (rpcError) {
      safeLog(deps.logger, "error", {
        ...baseLogFields,
        phase: "persistence",
        status: "error",
        deterministicCount: deterministicCandidates.length,
        aiCount: provider.entities.length,
        providerStatus: provider.status,
        errorCategory: "rpc_failed",
        durationMs: (deps.now?.() ?? Date.now()) - startedAt,
      });
      return errorResponse("PERSISTENCE_FAILED", "Entity extraction could not be saved.", 500, corsHeaders);
    }

    const response: ExtractEntitiesSuccessResponse = {
      status: "success",
      caseId: body.caseId,
      incidentId: body.incidentId,
      deterministicCount: deterministicCandidates.length,
      aiCount: provider.entities.length,
      resolvedCandidateCount: acceptedCandidates.length,
      savedEntityCount: Number(rpcData?.entity_count ?? 0),
      savedMentionCount: Number(rpcData?.mention_count ?? 0),
      savedRelationshipCount: Number(rpcData?.relationship_count ?? 0),
      providerUsed: provider.providerUsed,
      providerStatus: provider.status,
      warnings: [...warnings],
    };

    safeLog(deps.logger, "info", {
      ...baseLogFields,
      phase: "complete",
      status: "success",
      deterministicCount: response.deterministicCount,
      aiCount: response.aiCount,
      savedEntityCount: response.savedEntityCount,
      savedMentionCount: response.savedMentionCount,
      savedRelationshipCount: response.savedRelationshipCount,
      providerStatus: response.providerStatus,
      durationMs: (deps.now?.() ?? Date.now()) - startedAt,
    });

    return safeJsonResponse(response, 200, corsHeaders);
  };
}
