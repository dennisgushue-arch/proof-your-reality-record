import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";
import {
  isEarlyAdopterEligible,
  isUsableStripeDiscountId,
  isValidStripePriceId,
  isValidStripeSecretKey,
  resolveAllowPromotionCodes,
  shouldRetryWithoutCoupon,
} from "../_shared/billingCheckout.ts";
import { getBillingOffer, resolveBillingCheckoutMode } from "../../../src/lib/billing.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const earlyAdopterCouponId = Deno.env.get("STRIPE_COUPON_ID_EARLY_ADOPTER_50") ?? "";
const appLaunchDateIso = Deno.env.get("APP_LAUNCH_DATE_ISO") ?? "";

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getTraceId(req: Request) {
  return req.headers.get("x-request-id") ?? crypto.randomUUID();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const traceId = getTraceId(req);

  try {
    if (!isValidStripeSecretKey(Deno.env.get("STRIPE_SECRET_KEY"))) {
      return jsonResponse({
        error: "Missing or invalid STRIPE_SECRET_KEY. Set a real sk_live_... or sk_test_... value in Supabase secrets.",
        traceId,
      }, 500);
    }

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse({ error: "Supabase function credentials are not configured", traceId }, 500);
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

    const { offerId } = await req.json();
    const offer = typeof offerId === "string" ? getBillingOffer(offerId) : null;

    if (!offer) {
      return jsonResponse({ error: "A valid billing offer is required", traceId }, 400);
    }

    const priceId = Deno.env.get(offer.priceEnvKey)?.trim();
    if (!isValidStripePriceId(priceId)) {
      return jsonResponse({
        error: `Missing or invalid ${offer.priceEnvKey} for ${offer.title}`,
        traceId,
      }, 500);
    }

    if (priceId === earlyAdopterCouponId.trim()) {
      return jsonResponse({
        error: `${offer.priceEnvKey} is incorrectly set to the early-adopter coupon. Configure a Stripe price_... ID for ${offer.title}.`,
        traceId,
      }, 500);
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: subRow, error: subscriptionLookupError } = await adminClient
      .from("subscriptions")
      .select("stripe_customer_id, stripe_subscription_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subscriptionLookupError) throw subscriptionLookupError;

    let stripeCustomerId = subRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      stripeCustomerId = customer.id;

      const { error: customerSaveError } = await adminClient.from("subscriptions").upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
        plan: "free",
        status: "inactive",
      });

      if (customerSaveError) throw customerSaveError;
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? new URL(req.url).origin;

    const hasExistingSubscription = Boolean(subRow?.stripe_subscription_id);
    const defaultTrialDays = Number.parseInt(Deno.env.get("STRIPE_TRIAL_DAYS") ?? "7", 10);
    const trialDays = Number.isFinite(offer.trialDays ?? defaultTrialDays) ? (offer.trialDays ?? defaultTrialDays) : 0;
    const shouldApplyTrial = offer.billingMode === "subscription" && !hasExistingSubscription && trialDays > 0;

    const earlyAdopterEligible = isEarlyAdopterEligible(user.created_at ?? null, appLaunchDateIso);
    const appliedCouponId = offer.billingMode === "subscription" && earlyAdopterEligible && isUsableStripeDiscountId(earlyAdopterCouponId)
      ? earlyAdopterCouponId.trim()
      : null;
    const discounts = appliedCouponId
      ? [{ coupon: appliedCouponId }]
      : undefined;

    const subscriptionData = shouldApplyTrial
      ? { trial_period_days: trialDays }
      : undefined;

    const billingMode = resolveBillingCheckoutMode(offer);
    const buildSessionParams = (activeDiscounts?: { coupon: string }[]) => ({
      customer: stripeCustomerId,
      mode: billingMode,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      discounts: activeDiscounts,
      success_url: `${siteUrl}/pricing?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: resolveAllowPromotionCodes(Boolean(activeDiscounts), offer.allowPromotionCodes ?? true),
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan: offer.plan,
        offer_id: offer.id,
        billing_mode: billingMode,
        access_days: String(offer.accessDays),
        trial_days: shouldApplyTrial ? String(trialDays) : "0",
        early_adopter_discount_applied: activeDiscounts ? "true" : "false",
        price_secret_source: offer.priceEnvKey,
      },
    });

    let session;
    try {
      session = await stripe.checkout.sessions.create(buildSessionParams(discounts));
    } catch (error) {
      if (!discounts || !shouldRetryWithoutCoupon(error)) throw error;

      console.warn(`Retrying checkout without early adopter coupon. Trace: ${traceId}`);
      session = await stripe.checkout.sessions.create(buildSessionParams());
    }

    return jsonResponse({ url: session.url, traceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Checkout session failed. Trace: ${traceId}`, error);
    return jsonResponse({ error: message, traceId }, 500);
  }
});
