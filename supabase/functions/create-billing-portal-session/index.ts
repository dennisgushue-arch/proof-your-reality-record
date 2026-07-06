import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function resolveTraceId(req: Request) {
  const incoming = req.headers.get("x-client-trace-id")?.trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

function logTrace(traceId: string, step: string, payload?: Record<string, unknown>) {
  console.log("[billing-portal-trace]", { traceId, step, ...(payload ?? {}) });
}

function jsonResponse(payload: Record<string, unknown>, status: number, traceId: string) {
  return new Response(JSON.stringify({ ...payload, traceId }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "x-billing-portal-trace-id": traceId,
    },
  });
}

function resolveSiteUrl(input: unknown, requestUrl: string) {
  const fallback = Deno.env.get("SITE_URL") ?? new URL(requestUrl).origin;
  if (typeof input !== "string") return fallback;

  const trimmed = input.trim();
  if (!trimmed) return fallback;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    return parsed.origin;
  } catch {
    return fallback;
  }
}

serve(async (req) => {
  const traceId = resolveTraceId(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logTrace(traceId, "request-start", { method: req.method, url: req.url });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logTrace(traceId, "missing-auth-header");
      return jsonResponse({ error: "Missing Authorization header" }, 401, traceId);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      logTrace(traceId, "unauthorized-user", { authError: authError?.message ?? null });
      return jsonResponse({ error: "Unauthorized" }, 401, traceId);
    }

    const { siteUrl: requestedSiteUrl } = await req.json().catch(() => ({}));

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: subRow } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      logTrace(traceId, "create-stripe-customer", { userId: user.id });
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      await adminClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        plan: "free",
        status: "inactive",
      });
    }

    const siteUrl = resolveSiteUrl(requestedSiteUrl, req.url);
    const portal = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${siteUrl}/account`,
    });

    logTrace(traceId, "portal-session-created", { userId: user.id, hasUrl: Boolean(portal.url) });
    return jsonResponse({ url: portal.url }, 200, traceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logTrace(traceId, "unexpected-error", { message });
    return jsonResponse({ error: message }, 500, traceId);
  }
});
