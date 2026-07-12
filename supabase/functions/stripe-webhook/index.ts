import Stripe from "npm:stripe@15.12.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is required");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is required");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20"
});
const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);
function planFromPriceId(priceId) {
  if (!priceId) return "free";
  const pro = Deno.env.get("STRIPE_PRICE_ID_PRO");
  const proMonthly = Deno.env.get("STRIPE_PRICE_ID_PRO_MONTHLY");
  const premium = Deno.env.get("STRIPE_PRICE_ID_PREMIUM");
  const premiumMonthly = Deno.env.get("STRIPE_PRICE_ID_PREMIUM_MONTHLY");
  const premiumAnnual = Deno.env.get("STRIPE_PRICE_ID_PREMIUM_ANNUAL");
  if (priceId === pro || priceId === proMonthly) return "pro";
  if (priceId === premium || priceId === premiumMonthly || priceId === premiumAnnual) return "premium";
  return "free";
}
async function upsertFromSubscription(sub, userId) {
  const priceId = sub.items.data[0]?.price?.id;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) throw new Error("Stripe subscription customer id missing");
  await adminClient.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan: planFromPriceId(priceId),
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    cancel_at_period_end: sub.cancel_at_period_end
  });
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders
    });
  }
  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    switch(event.type){
      case "checkout.session.completed":
        {
          const session = event.data.object;
          if (session.mode !== "subscription" || !session.subscription) break;
          let userId = (session.metadata?.user_id ?? session.client_reference_id ?? "").trim();
          if (!userId && session.customer) {
            const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
            const { data: subByCustomer } = await adminClient.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
            userId = subByCustomer?.user_id ?? "";
          }
          if (!userId) break;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription, userId);
          break;
        }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        {
          const subscription = event.data.object;
          const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
          const { data: row } = await adminClient.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
          if (!row?.user_id) break;
          await upsertFromSubscription(subscription, row.user_id);
          break;
        }
      default:
        break;
    }
    return new Response(JSON.stringify({
      received: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({
      error: message
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
