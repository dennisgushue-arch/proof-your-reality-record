import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

type AnalyzeIncidentRequest = {
  title: string;
  narrative: string;
  occurred_at: string;
  location?: string | null;
  people?: string[];
};

type AIAnalysis = {
  neutral_summary: string;
  timeline: string[];
  key_claims: string[];
  contradictions: string[];
  missing_evidence: string[];
  follow_ups: string[];
  emotional_language_removed: string;
  evidence_quality_score: number;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function jsonError(status: number, error: string, traceId?: string) {
  return new Response(JSON.stringify(traceId ? { error, traceId } : { error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeString(value: unknown, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim() || fallback;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeAnalysis(value: unknown): AIAnalysis {
  const obj = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

  const scoreRaw = typeof obj.evidence_quality_score === "number"
    ? obj.evidence_quality_score
    : Number(obj.evidence_quality_score ?? 50);
  const evidence_quality_score = Number.isFinite(scoreRaw)
    ? Math.max(0, Math.min(100, Math.round(scoreRaw)))
    : 50;

  const neutral_summary = safeString(obj.neutral_summary, "Summary unavailable.");
  const timeline = safeStringArray(obj.timeline);
  const key_claims = safeStringArray(obj.key_claims);
  const contradictions = safeStringArray(obj.contradictions);
  const missing_evidence = safeStringArray(obj.missing_evidence);
  const follow_ups = safeStringArray(obj.follow_ups);
  const emotional_language_removed = safeString(
    obj.emotional_language_removed,
    neutral_summary,
  );

  return {
    neutral_summary,
    timeline: timeline.length ? timeline : ["Timeline extraction unavailable."],
    key_claims: key_claims.length ? key_claims : ["No explicit claims detected."],
    contradictions,
    missing_evidence,
    follow_ups: follow_ups.length
      ? follow_ups
      : ["Collect any supporting evidence and timeline details while memory is fresh."],
    emotional_language_removed,
    evidence_quality_score,
  };
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

async function runLLMAnalysis(input: AnalyzeIncidentRequest): Promise<AIAnalysis> {
  const apiKey = Deno.env.get("LLM_API_KEY") ?? "";
  if (!apiKey) {
    throw new Error("LLM_API_KEY is not configured");
  }

  const model = Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini";
  const baseUrl = (Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, "");

  const prompt = {
    title: input.title,
    occurred_at: input.occurred_at,
    location: input.location ?? null,
    people: input.people ?? [],
    narrative: input.narrative,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are an evidence-analysis assistant. Return ONLY valid JSON. No markdown. No prose outside JSON. Keep output factual and neutral. Never provide legal advice.",
        },
        {
          role: "user",
          content:
            `Analyze this incident and return a JSON object with exactly these keys: ` +
            `neutral_summary (string), timeline (string[]), key_claims (string[]), contradictions (string[]), missing_evidence (string[]), follow_ups (string[]), emotional_language_removed (string), evidence_quality_score (number 0-100).\n\n` +
            `Incident:\n${JSON.stringify(prompt)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("LLM response missing message content");
  }

  const rawObject = extractFirstJsonObject(content);
  return normalizeAnalysis(rawObject);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(401, "Missing Authorization header");
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonError(401, "Unauthorized");
    }

    const body = await req.json() as Partial<AnalyzeIncidentRequest>;
    const input: AnalyzeIncidentRequest = {
      title: safeString(body.title),
      narrative: safeString(body.narrative),
      occurred_at: safeString(body.occurred_at),
      location: body.location ?? null,
      people: Array.isArray(body.people)
        ? body.people.filter((p): p is string => typeof p === "string")
        : [],
    };

    if (!input.title || !input.narrative || !input.occurred_at) {
      return jsonError(400, "title, narrative, and occurred_at are required");
    }

    const analysis = await runLLMAnalysis(input);

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const traceId = crypto.randomUUID();
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("analyze-incident failed", { traceId, message });
    return jsonError(500, message, traceId);
  }
});
