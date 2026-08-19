import Stripe from "npm:stripe@15.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is required");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

function planFromPriceId(priceId?: string) {
  if (!priceId) return "free";

  const premiumPriceIds = [
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM"),
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY"),
    Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL"),
  ].filter((value): value is string => Boolean(value));

  const proPriceIds = [
    Deno.env.get("STRIPE_PRICE_ID_PRO"),
  ].filter((value): value is string => Boolean(value));

  if (premiumPriceIds.includes(priceId)) return "premium";
  if (proPriceIds.includes(priceId)) return "pro";
  return "free";
}

function resolveCurrentPeriodEnd(sub: Stripe.Subscription) {
  const topLevel = (sub as unknown as { current_period_end?: number }).current_period_end;
  const itemLevel = (sub.items.data[0] as unknown as { current_period_end?: number } | undefined)?.current_period_end;
  const value = typeof topLevel === "number" ? topLevel : itemLevel;

  return typeof value === "number" && Number.isFinite(value)
    ? new Date(value * 1000).toISOString()
    : null;
}

async function processSubscriptionEvent(
  event: Stripe.Event,
  sub: Stripe.Subscription,
  userId: string,
) {
  const priceId = sub.items.data[0]?.price?.id;
  const customerId =
    typeof sub.customer === "string"
      ? sub.customer
      : sub.customer?.id;

  if (!customerId) {
    throw new Error("Stripe subscription customer id missing");
  }

  const { data, error } = await adminClient.rpc(
    "process_stripe_subscription_event",
    {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: event.created,
      p_user_id: userId,
      p_customer_id: customerId,
      p_subscription_id: sub.id,
      p_plan: planFromPriceId(priceId),
      p_status: sub.status,
      p_current_period_end: resolveCurrentPeriodEnd(sub),
      p_cancel_at_period_end: sub.cancel_at_period_end,
    },
  );

  if (error) {
    throw new Error(
      `subscription event processing failed: ${error.message}`,
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function processOneTimePurchase(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
  userId: string,
) {
  const accessDays = Number.parseInt(
    session.metadata?.access_days ?? "0",
    10,
  );

  if (!Number.isFinite(accessDays) || accessDays <= 0) {
    throw new Error("Missing access days for prepaid purchase");
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? "";

  const plan =
    (session.metadata?.plan as "pro" | "premium" | undefined)
      ?? "premium";

  const { data, error } = await adminClient.rpc(
    "process_stripe_prepaid_event",
    {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: event.created,
      p_user_id: userId,
      p_customer_id: customerId,
      p_plan: plan,
      p_access_days: accessDays,
    },
  );

  if (error) {
    throw new Error(
      `prepaid event processing failed: ${error.message}`,
    );
  }

  return Array.isArray(data) ? data[0] : data;
}

async function recordSubscriptionStarted(
  eventId: string,
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription,
  userId: string,
) {
  const { data: existing, error: lookupError } = await adminClient
    .from("product_events")
    .select("id")
    .eq("event_name", "subscription_started")
    .eq("event_data->>stripe_event_id", eventId)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`subscription event lookup failed: ${lookupError.message}`);
  }

  if (existing) return;

  const priceId = subscription.items.data[0]?.price?.id;

  const { error: insertError } = await adminClient
    .from("product_events")
    .insert({
      user_id: userId,
      event_name: "subscription_started",
      event_data: {
        source: "stripe_webhook",
        stripe_event_id: eventId,
        checkout_session_id: session.id,
        stripe_subscription_id: subscription.id,
        plan: planFromPriceId(priceId),
        status: subscription.status,
        price_id: priceId ?? null,
        offer_id: session.metadata?.offer_id ?? null,
        billing_mode: session.metadata?.billing_mode ?? "subscription",
        trial_days: session.metadata?.trial_days ?? null,
      },
    });

  if (insertError) {
    throw new Error(`subscription event insert failed: ${insertError.message}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        let userId = (
          session.metadata?.user_id ??
          session.client_reference_id ??
          ""
        ).trim();

        if (!userId && session.customer) {
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer.id;

          const { data: subByCustomer, error: customerLookupError } =
            await adminClient
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();

          if (customerLookupError) {
            throw new Error(
              `customer lookup failed: ${customerLookupError.message}`,
            );
          }

          userId = subByCustomer?.user_id ?? "";
        }

        if (!userId) break;

        if (session.mode === "payment") {
          await processOneTimePurchase(event, session, userId);
          break;
        }

        if (
          session.mode !== "subscription" ||
          !session.subscription
        ) {
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const subscription =
          await stripe.subscriptions.retrieve(subscriptionId);

        await processSubscriptionEvent(event, subscription, userId);
        await recordSubscriptionStarted(
          event.id,
          session,
          subscription,
          userId,
        );

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription =
          event.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const { data: row, error: rowLookupError } =
          await adminClient
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

        if (rowLookupError) {
          throw new Error(
            `subscription row lookup failed: ${rowLookupError.message}`,
          );
        }

        if (!row?.user_id) break;

        await processSubscriptionEvent(
          event,
          subscription,
          row.user_id,
        );

        break;
      }

      default:
        break;
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error";

    console.error("Stripe webhook failed", { message });

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
