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

const trialDays = Number.parseInt(Deno.env.get("STRIPE_TRIAL_DAYS") ?? "7", 10);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!stripe) throw new Error("Stripe not configured");

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

    const { plan } = await req.json();
    if (!["pro", "premium"].includes(plan)) {
      return new Response(JSON.stringify({ error: "Plan must be pro or premium" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const priceMap: Record<string, string | undefined> = {
      pro: Deno.env.get("STRIPE_PRICE_ID_PRO"),
      premium: Deno.env.get("STRIPE_PRICE_ID_PREMIUM"),
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return new Response(JSON.stringify({ error: `Missing Stripe price ID for ${plan}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const discounts = earlyAdopterEligible && earlyAdopterCouponId
      ? [{ coupon: earlyAdopterCouponId }]
      : undefined;

    const subscriptionData = shouldApplyTrial
      ? { trial_period_days: trialDays }
      : undefined;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: subscriptionData,
      discounts,
      success_url: `${siteUrl}/pricing?checkout=success`,
      cancel_url: `${siteUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan,
        trial_days: shouldApplyTrial ? String(trialDays) : "0",
        early_adopter_discount_applied: discounts ? "true" : "false",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
