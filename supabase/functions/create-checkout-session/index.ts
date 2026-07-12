// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0?target=denonext";
// deno-lint-ignore no-import-prefix
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const trialDays = Number.parseInt(Deno.env.get("STRIPE_TRIAL_DAYS") ?? "7", 10);
const earlyAdopterCouponId = Deno.env.get("STRIPE_COUPON_ID_EARLY_ADOPTER_50") ?? "";
const appLaunchDateIso = Deno.env.get("APP_LAUNCH_DATE_ISO") ?? "";
const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]+$/;
const STRIPE_SECRET_KEY_PATTERN = /^sk_(live|test)_[A-Za-z0-9]+$/;

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getTraceId = (req: Request) => req.headers.get("x-client-trace-id") ?? crypto.randomUUID();

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

function isValidStripeSecretKey(secret?: string | null) {
  if (!secret) return false;
  const candidate = secret.trim();
  if (!candidate) return false;

  if (candidate.includes("__REDACTED__") || candidate.toLowerCase().includes("redacted")) {
    return false;
  }

  return STRIPE_SECRET_KEY_PATTERN.test(candidate);
}

function isUsableStripeDiscountId(value?: string | null) {
  if (!value) return false;

  const candidate = value.trim();
  if (!candidate) return false;

  if (candidate.includes("__REDACTED__") || candidate.toLowerCase().includes("redacted")) {
    return false;
  }

  return true;
}

function shouldRetryWithoutCoupon(error: unknown) {
  if (!(error instanceof Error)) return false;

  return /No such coupon/i.test(error.message);
}

function firstValidPriceId(secretNames: string[]) {
  for (const secretName of secretNames) {
    const candidate = Deno.env.get(secretName)?.trim();
    if (candidate && STRIPE_PRICE_ID_PATTERN.test(candidate)) {
      return { priceId: candidate, source: secretName };
    }
  }

  return { priceId: null, source: null };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const traceId = getTraceId(req);

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!isValidStripeSecretKey(stripeSecretKey)) {
      return jsonResponse({
        error: "Missing or invalid STRIPE_SECRET_KEY. Set a real sk_live_... or sk_test_... value in Supabase secrets.",
        traceId,
      }, 500);
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase environment variables are incomplete", traceId }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header", traceId }, 401);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized", traceId }, 401);
    }

    const { plan } = await req.json();
    if (!["pro", "premium"].includes(plan)) {
      return jsonResponse({ error: "Plan must be pro or premium", traceId }, 400);
    }

    const priceConfig = plan === "pro"
      ? firstValidPriceId(["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO"])
      : firstValidPriceId(["STRIPE_PRICE_ID_PREMIUM_MONTHLY", "STRIPE_PRICE_ID_PREMIUM"]);

    const priceId = priceConfig.priceId;
    if (!priceId) {
      const expectedSecrets = plan === "pro"
        ? ["STRIPE_PRICE_ID_PRO_MONTHLY", "STRIPE_PRICE_ID_PRO"]
        : ["STRIPE_PRICE_ID_PREMIUM_MONTHLY", "STRIPE_PRICE_ID_PREMIUM"];

      return jsonResponse({
        error: `Missing or invalid Stripe price ID for ${plan}. Expected one of: ${expectedSecrets.join(", ")}`,
        traceId,
      }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: subRow } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
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

    const siteUrl = Deno.env.get("SITE_URL") ?? new URL(req.url).origin;

    const hasExistingSubscription = Boolean(subRow?.stripe_subscription_id);
    const shouldApplyTrial = !hasExistingSubscription && Number.isFinite(trialDays) && trialDays > 0;

    const earlyAdopterEligible = isEarlyAdopterEligible(user.created_at ?? null);
    const appliedCouponId = earlyAdopterEligible && isUsableStripeDiscountId(earlyAdopterCouponId)
      ? earlyAdopterCouponId.trim()
      : null;
    const discounts = appliedCouponId
      ? [{ coupon: appliedCouponId }]
      : undefined;

    const subscriptionData = shouldApplyTrial
      ? { trial_period_days: trialDays }
      : undefined;

    const buildSessionParams = (activeDiscounts?: { coupon: string }[]) => ({
      customer: stripeCustomerId,
      mode: "subscription" as const,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      discounts: activeDiscounts,
      success_url: `${siteUrl}/pricing?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: activeDiscounts ? undefined : true,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan,
        price_secret_source: priceConfig.source ?? "unknown",
        trial_days: shouldApplyTrial ? String(trialDays) : "0",
        early_adopter_discount_applied: activeDiscounts ? "true" : "false",
      },
    });

    let session;

    try {
      session = await stripe.checkout.sessions.create(buildSessionParams(discounts));
    } catch (error) {
      if (!discounts || !shouldRetryWithoutCoupon(error)) {
        throw error;
      }

      console.warn(`Retrying checkout without early adopter coupon. Trace: ${traceId}`);
      session = await stripe.checkout.sessions.create(buildSessionParams(undefined));
    }

    return jsonResponse({ url: session.url, traceId }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message, traceId }, 500);
  }
});
