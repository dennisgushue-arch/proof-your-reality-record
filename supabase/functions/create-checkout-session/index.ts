import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";
import { getBillingOffer, resolveBillingCheckoutMode } from "../../../src/lib/billing.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const earlyAdopterCouponId = Deno.env.get("STRIPE_COUPON_ID_EARLY_ADOPTER_50") ?? "";
const appLaunchDateIso = Deno.env.get("APP_LAUNCH_DATE_ISO") ?? "";

function getEarlyAdopterWindowEnd(launchIso: string) {
  if (!launchIso) return null;
  const launch = new Date(launchIso);
  if (Number.isNaN(launch.getTime())) return null;

  const windowEnd = new Date(launch);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + 3);
  return windowEnd;
}

function isEarlyAdopterEligible(userCreatedAt?: string | null) {
  if (!userCreatedAt) return false;
  const userCreated = new Date(userCreatedAt);
  if (Number.isNaN(userCreated.getTime())) return false;

  const windowEnd = getEarlyAdopterWindowEnd(appLaunchDateIso);
  if (!windowEnd) return false;

  return userCreated <= windowEnd;
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

function resolveTraceId(req: Request) {
  const incoming = req.headers.get("x-client-trace-id")?.trim();
  if (incoming) return incoming;
  return crypto.randomUUID();
}

function logTrace(traceId: string, step: string, payload?: Record<string, unknown>) {
  console.log("[checkout-trace]", { traceId, step, ...(payload ?? {}) });
}

function jsonResponse(payload: Record<string, unknown>, status: number, traceId: string) {
  return new Response(JSON.stringify({ ...payload, traceId }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "x-checkout-trace-id": traceId,
    },
  });
}

serve(async (req) => {
  const traceId = resolveTraceId(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logTrace(traceId, "request-start", { method: req.method, url: req.url });

    if (!stripe) throw new Error("Stripe not configured");

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

    logTrace(traceId, "authorized-user", { userId: user.id });

    const { offerId, siteUrl: requestedSiteUrl } = await req.json();
    const offer = typeof offerId === "string" ? getBillingOffer(offerId) : null;

    if (!offer) {
      logTrace(traceId, "invalid-offer", { offerId: typeof offerId === "string" ? offerId : null });
      return jsonResponse({ error: "A valid billing offer is required" }, 400, traceId);
    }

    const priceId = Deno.env.get(offer.priceEnvKey);
    if (!priceId) {
      logTrace(traceId, "missing-price-id", { offerId: offer.id, envKey: offer.priceEnvKey });
      return jsonResponse({ error: `Missing Stripe price ID for ${offer.title}` }, 500, traceId);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: subRow } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
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

    const hasExistingSubscription = Boolean(subRow?.stripe_subscription_id);
    const defaultTrialDays = Number.parseInt(Deno.env.get("STRIPE_TRIAL_DAYS") ?? "7", 10);
    const trialDays = Number.isFinite(offer.trialDays ?? defaultTrialDays) ? (offer.trialDays ?? defaultTrialDays) : 0;
    const shouldApplyTrial = offer.billingMode === "subscription" && !hasExistingSubscription && trialDays > 0;

    const earlyAdopterEligible = isEarlyAdopterEligible(user.created_at ?? null);
    const discounts = offer.billingMode === "subscription" && earlyAdopterEligible && earlyAdopterCouponId
      ? [{ coupon: earlyAdopterCouponId }]
      : undefined;

    const subscriptionData = shouldApplyTrial
      ? { trial_period_days: trialDays }
      : undefined;

    const billingMode = resolveBillingCheckoutMode(offer);
    const metadata = {
      user_id: user.id,
      plan: offer.plan,
      offer_id: offer.id,
      billing_mode: billingMode,
      access_days: String(offer.accessDays),
      trial_days: shouldApplyTrial ? String(trialDays) : "0",
      early_adopter_discount_applied: discounts ? "true" : "false",
    };

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: billingMode,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      discounts,
      success_url: `${siteUrl}/pricing?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: offer.allowPromotionCodes ?? true,
      client_reference_id: user.id,
      metadata,
    });

    logTrace(traceId, "checkout-session-created", {
      userId: user.id,
      offerId: offer.id,
      billingMode,
      checkoutSessionId: session.id,
      hasUrl: Boolean(session.url),
    });

    return jsonResponse({ url: session.url }, 200, traceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logTrace(traceId, "unexpected-error", { message });
    return jsonResponse({ error: message }, 500, traceId);
  }
});
