import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";
import { createExtractEntitiesHandler } from "./handler.ts";
import { DEFAULT_MAX_AI_CHARS, DEFAULT_PROVIDER_TIMEOUT_MS } from "./validation.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const providerConfig = {
  apiKey: Deno.env.get("LLM_API_KEY") ?? "",
  baseUrl: (Deno.env.get("LLM_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/$/, ""),
  model: Deno.env.get("LLM_MODEL") ?? "gpt-4o-mini",
  timeoutMs: DEFAULT_PROVIDER_TIMEOUT_MS,
  maxAiChars: DEFAULT_MAX_AI_CHARS,
};

const handler = createExtractEntitiesHandler({
  corsHeaders,
  providerConfig,
  createUserClient: (authorizationHeader) => createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorizationHeader } },
  }),
});

serve(handler);
