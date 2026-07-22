import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

type ProofAIRequest = {
  prompt: string;
  caseId: string;
  action?: "summarize_case";
};

type CaseRow = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  description: string | null;
};

type IncidentRow = {
  id: string;
  title: string;
  occurred_at: string;
  neutral_summary: string | null;
  ai_analysis: unknown;
};

type AIFinding = {
  label: string;
  value: string;
  incidentId?: string;
};

type AISource = {
  incidentId: string;
  title: string;
  occurredAt: string;
};

type ProofAIResponse = {
  title: string;
  summary: string;
  findings: AIFinding[];
  recommendations: string[];
  confidence?: "high" | "medium" | "low";
  sources?: AISource[];
};

type AuditStatus = "success" | "error";
type AuditConfidence = "high" | "medium" | "low";
type ProofAIFailurePhase = "request" | "provider" | "response_parsing" | "audit_logging";

class ProofAIError extends Error {
  failurePhase: ProofAIFailurePhase;
  providerStatusCode?: number;

  constructor(message: string, failurePhase: ProofAIFailurePhase, providerStatusCode?: number) {
    super(message);
    this.name = "ProofAIError";
    this.failurePhase = failurePhase;
    this.providerStatusCode = providerStatusCode;
  }
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function safeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "Unknown error");
}

function getProofAIFailurePhase(error: unknown, fallback: ProofAIFailurePhase): ProofAIFailurePhase {
  if (error instanceof ProofAIError) return error.failurePhase;
  return fallback;
}

function getProviderStatusCode(error: unknown): number | undefined {
  if (error instanceof ProofAIError) return error.providerStatusCode;
  return undefined;
}

function logProofAIFailure(error: unknown, fallbackPhase: ProofAIFailurePhase) {
  console.error("Proof AI request error", {
    message: getErrorMessage(error),
    phase: getProofAIFailurePhase(error, fallbackPhase),
    providerStatusCode: getProviderStatusCode(error) ?? null,
  });
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted-email]")
    .replace(/\+?\d?[\d\s().-]{7,}\d/g, "[redacted-phone]")
    .replace(/https?:\/\/[^\s]+/gi, "[redacted-link]");
}

function safeStringArray(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function readAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractFirstJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      const maybeJson = trimmed.slice(first, last + 1);
      return JSON.parse(maybeJson);
    }
    throw new Error("No valid JSON object found in LLM response");
  }
}

function detectTimelineGapCount(incidents: IncidentRow[], thresholdHours = 24): number {
  if (incidents.length <= 1) return 0;

  const sorted = [...incidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  let gaps = 0;
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = new Date(sorted[index - 1].occurred_at).getTime();
    const current = new Date(sorted[index].occurred_at).getTime();
    const diffHours = (current - previous) / (1000 * 60 * 60);
    if (Number.isFinite(diffHours) && diffHours >= thresholdHours) {
      gaps += 1;
    }
  }

  return gaps;
}

function normalizeProofAIResponse(value: unknown): ProofAIResponse {
  const obj = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const rawFindings = Array.isArray(obj.findings) ? obj.findings : [];
  const findings = rawFindings
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const label = safeString(row.label);
      const value = safeString(row.value);
      if (!label || !value) return null;
      const incidentId = safeString(row.incidentId || row.incident_id);
      return {
        label,
        value,
        ...(incidentId ? { incidentId } : {}),
      };
    })
    .filter((item): item is AIFinding => Boolean(item))
    .slice(0, 6);

  const recommendations = safeStringArray(obj.recommendations, 6);
  const confidenceValue = safeString(obj.confidence || obj.confidence_label).toLowerCase();
  const confidence = confidenceValue === "high" || confidenceValue === "medium" || confidenceValue === "low"
    ? confidenceValue
    : undefined;

  const rawSources = Array.isArray(obj.sources) ? obj.sources : [];
  const sources = rawSources
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const row = item as Record<string, unknown>;
      const incidentId = safeString(row.incidentId || row.incident_id);
      const title = safeString(row.title);
      const occurredAt = safeString(row.occurredAt || row.occurred_at);
      if (!incidentId || !title) return null;
      return {
        incidentId,
        title,
        occurredAt,
      };
    })
    .filter((item): item is AISource => Boolean(item))
    .slice(0, 6);

  return {
    title: safeString(obj.title, "AI case brief"),
    summary: safeString(obj.summary, "Analysis complete."),
    findings,
    recommendations,
    ...(confidence ? { confidence } : {}),
    ...(sources.length ? { sources } : {}),
  };
}

function buildSourcesFromIncidents(incidents: IncidentRow[], max = 6): AISource[] {
  return incidents
    .slice(0, max)
    .map((incident) => ({
      incidentId: incident.id,
      title: incident.title,
      occurredAt: incident.occurred_at,
    }));
}

function inferConfidence(incidents: IncidentRow[]): "high" | "medium" | "low" {
  if (!incidents.length) return "low";

  const withStructuredAnalysis = incidents.filter((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    const timeline = safeStringArray(analysis?.timeline);
    const claims = safeStringArray(analysis?.key_claims);
    return timeline.length > 0 || claims.length > 0;
  }).length;

  const ratio = withStructuredAnalysis / incidents.length;
  if (incidents.length >= 6 && ratio >= 0.7) return "high";
  if (incidents.length >= 3 && ratio >= 0.4) return "medium";
  return "low";
}

function buildFallbackResponse(caseRow: CaseRow, incidents: IncidentRow[]): ProofAIResponse {
  const contradictions = incidents.reduce((sum, incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return sum + safeStringArray(analysis?.contradictions).length;
  }, 0);
  const timelineGaps = detectTimelineGapCount(incidents);

  return {
    title: "AI case brief",
    summary: `${caseRow.title} includes ${incidents.length} incident${incidents.length === 1 ? "" : "s"}, ${contradictions} possible contradiction${contradictions === 1 ? "" : "s"}, and ${timelineGaps} timeline gap${timelineGaps === 1 ? "" : "s"}.`,
    findings: [
      {
        label: "Case category",
        value: caseRow.category,
      },
      {
        label: "Most recent incident",
        value: incidents[0]?.title ?? "No incidents logged",
      },
      {
        label: "Review focus",
        value: "Confirm timeline continuity and link supporting records to each incident.",
      },
    ],
    recommendations: [
      "Review contradiction flags side-by-side with source records.",
      "Fill timeline gaps with messages, receipts, or photos.",
      "Generate a case summary before export or key interactions.",
    ],
    confidence: inferConfidence(incidents),
    sources: buildSourcesFromIncidents(incidents),
  };
}

async function runProofAI(prompt: string, caseRow: CaseRow, incidents: IncidentRow[]): Promise<ProofAIResponse> {
  const apiKey = Deno.env.get("LLM_API_KEY") ?? "";
  if (!apiKey) {
    return buildFallbackResponse(caseRow, incidents);
  }

  const model = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
  const baseUrl = (Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const supportsCustomTemperature = !model.toLowerCase().startsWith("gpt-5");

  // Data minimization: only send fields required for summary/intelligence actions.
  const compactCase = {
    id: caseRow.id,
    title: redactSensitiveText(caseRow.title),
    category: caseRow.category,
    description: redactSensitiveText(caseRow.description ?? ""),
  };

  const compactIncidents = incidents.slice(0, 30).map((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return {
      id: incident.id,
      title: redactSensitiveText(incident.title),
      occurred_at: incident.occurred_at,
      neutral_summary: redactSensitiveText(incident.neutral_summary ?? ""),
      contradictions: safeStringArray(analysis?.contradictions),
      missing_evidence: safeStringArray(analysis?.missing_evidence),
      key_claims: safeStringArray(analysis?.key_claims),
      timeline: safeStringArray(analysis?.timeline),
    };
  });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        ...(supportsCustomTemperature ? { temperature: 0.2 } : {}),
        messages: [
          {
            role: "system",
            content:
              "You are Proof AI. Return ONLY valid JSON with keys: title(string), summary(string), findings(array of {label,value,incidentId?}), recommendations(string[]), confidence(string: high|medium|low), sources(array of {incidentId,title,occurredAt}). Keep output factual, neutral, and concise. Never provide legal advice or definitive guilt/truth claims.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prompt: redactSensitiveText(prompt),
              case: compactCase,
              incidents: compactIncidents,
            }),
          },
        ],
      }),
    });
  } catch (error) {
    throw new ProofAIError(`LLM request error: ${getErrorMessage(error)}`, "request");
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new ProofAIError(
      `LLM request failed (${response.status}): ${errorBody.slice(0, 300)}`,
      "provider",
      response.status,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new ProofAIError(`LLM response JSON parsing error: ${getErrorMessage(error)}`, "response_parsing");
  }
  const content = (payload as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new ProofAIError("LLM response missing message content", "response_parsing");
  }

  let rawObject: unknown;
  try {
    rawObject = extractFirstJsonObject(content);
  } catch (error) {
    throw new ProofAIError(`LLM response content parsing error: ${getErrorMessage(error)}`, "response_parsing");
  }
  const normalized = normalizeProofAIResponse(rawObject);

  return {
    ...normalized,
    confidence: normalized.confidence ?? inferConfidence(incidents),
    sources: normalized.sources?.length ? normalized.sources : buildSourcesFromIncidents(incidents),
  };
}

function normalizeAuditConfidence(value: unknown): AuditConfidence | null {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

async function logAuditEvent(input: {
  adminClient: ReturnType<typeof createClient> | null;
  userId: string;
  caseId: string;
  prompt: string;
  status: AuditStatus;
  confidence?: unknown;
}) {
  if (!input.adminClient) return;
  try {
    const { error } = await input.adminClient.from("ai_request_audit_log").insert({
      user_id: input.userId,
      case_id: input.caseId,
      prompt: redactSensitiveText(input.prompt).slice(0, 400),
      action_type: "summarize_case",
      status: input.status,
      response_confidence: input.status === "success" ? normalizeAuditConfidence(input.confidence) : null,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Proof AI audit logging error", {
      message: getErrorMessage(error),
      phase: "audit_logging",
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as Partial<ProofAIRequest>;
    const prompt = safeString(body.prompt);
    const caseId = safeString(body.caseId);
    const action = body.action === "summarize_case" ? body.action : "summarize_case";

    if (!prompt || !caseId) {
      return new Response(JSON.stringify({ error: "prompt and caseId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "summarize_case") {
      return new Response(JSON.stringify({ error: "Unsupported action. Currently only summarize_case is enabled." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : null;

    let caseRow: CaseRow | null = null;

    if (adminClient) {
      const { data, error } = await adminClient
        .from("cases")
        .select("id, user_id, title, category, description")
        .eq("id", caseId)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      caseRow = (data as CaseRow | null) ?? null;

      if (!caseRow) {
        return new Response(JSON.stringify({ error: "Case not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (caseRow.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: case does not belong to user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data } = await userClient
        .from("cases")
        .select("id, user_id, title, category, description")
        .eq("id", caseId)
        .maybeSingle();

      caseRow = (data as CaseRow | null) ?? null;

      if (!caseRow || caseRow.user_id !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden: case does not belong to user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const dataClient = adminClient ?? userClient;
    const { data: incidentsData, error: incidentsError } = await dataClient
      .from("incidents")
      .select("id, title, occurred_at, neutral_summary, ai_analysis")
      .eq("case_id", caseId)
      .order("occurred_at", { ascending: false })
      .limit(60);

    if (incidentsError) {
      return new Response(JSON.stringify({ error: incidentsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incidents = (incidentsData as IncidentRow[] | null) ?? [];
    let result: ProofAIResponse;
    try {
      result = await runProofAI(prompt, caseRow, incidents);
    } catch (error) {
      logProofAIFailure(error, "request");
      await logAuditEvent({
        adminClient,
        userId: user.id,
        caseId,
        prompt,
        status: "error",
      });
      throw error;
    }

    await logAuditEvent({
      adminClient,
      userId: user.id,
      caseId,
      prompt,
      status: "success",
      confidence: result.confidence,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
