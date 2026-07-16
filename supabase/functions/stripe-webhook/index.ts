import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@15.12.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-06-20",
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

function planFromPriceId(priceId?: string) {
  if (!priceId) return "free";

  const proPriceIds = [
    Deno.env.get("STRIPE_PRICE_ID_PRO"),
  ].filter((value): value is string => Boolean(value));

  const premiumPriceIds = [
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM"),
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY"),
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL"),
  ].filter((value): value is string => Boolean(value));

  if (proPriceIds.includes(priceId)) return "pro";
  if (premiumPriceIds.includes(priceId)) return "premium";
  return "free";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function upsertFromSubscription(sub: Stripe.Subscription, userId: string) {
  const priceId = sub.items.data[0]?.price?.id;

  await adminClient.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    plan: planFromPriceId(priceId),
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end,
  });
}

async function upsertFromOneTimePurchase(session: Stripe.Checkout.Session, userId: string) {
  const accessDays = Number.parseInt(session.metadata?.access_days ?? "0", 10);
  if (!Number.isFinite(accessDays) || accessDays <= 0) {
    throw new Error("Missing access days for prepaid purchase");
  }

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const { data: existingRow } = await adminClient
    .from("subscriptions")
    .select("stripe_subscription_id,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const baseDate = existingRow?.current_period_end
    ? new Date(existingRow.current_period_end)
    : new Date();
  const hasFutureAccess = !Number.isNaN(baseDate.getTime()) && baseDate.getTime() > Date.now();
  const nextStart = hasFutureAccess ? baseDate : new Date();
  const currentPeriodEnd = addDays(nextStart, accessDays);

  await adminClient.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: existingRow?.stripe_subscription_id ?? null,
    plan: (session.metadata?.plan as "pro" | "premium" | undefined) ?? "premium",
    status: "active",
    current_period_end: currentPeriodEnd.toISOString(),
    cancel_at_period_end: false,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId = (session.metadata?.user_id ?? session.client_reference_id ?? "").trim();

        if (!userId && session.customer) {
          const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
          const { data: subByCustomer } = await adminClient
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();
          userId = subByCustomer?.user_id ?? "";
        }

        if (!userId) break;

        if (session.mode === "payment") {
          await upsertFromOneTimePurchase(session, userId);
          break;
        }

        if (session.mode !== "subscription" || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await upsertFromSubscription(subscription, userId);
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

        const { data: row } = await adminClient
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!row?.user_id) break;

        await upsertFromSubscription(subscription, row.user_id);
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
