import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "../_shared/cors.ts";
import {
  GOOGLE_PLAY_PACKAGE_NAME,
  GOOGLE_PLAY_PRODUCTS,
  googlePlayStatus,
  grantsGooglePlayAccess,
  isKnownGooglePlayProduct,
} from "../_shared/googlePlay.ts";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

type GoogleSubscription = {
  subscriptionState?: string;
  acknowledgementState?: string;
  externalAccountIdentifiers?: { obfuscatedExternalAccountId?: string };
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function encodeJson(value: Record<string, unknown>) {
  return base64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function pemBytes(pem: string) {
  const body = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return Uint8Array.from(atob(body), (character) => character.charCodeAt(0));
}

async function getGoogleAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri || "https://oauth2.googleapis.com/token";
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  })}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemBytes(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const assertion = `${unsigned}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(`Google OAuth failed (${response.status})`);
  }
  return payload.access_token as string;
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return base64Url(new Uint8Array(digest));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") ?? "";
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !serviceAccountJson) {
      return jsonResponse({ error: "Google Play verification is not configured" }, 500);
    }
    if (!authHeader) return jsonResponse({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const productId = typeof body.productId === "string" ? body.productId : "";
    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken : "";
    if (!purchaseToken || !isKnownGooglePlayProduct(productId)) {
      return jsonResponse({ error: "A valid Google Play product and purchase token are required" }, 400);
    }

    const account = JSON.parse(serviceAccountJson) as ServiceAccount;
    if (!account.client_email || !account.private_key) throw new Error("Invalid Google Play service account JSON");
    const accessToken = await getGoogleAccessToken(account);
    const purchaseUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(GOOGLE_PLAY_PACKAGE_NAME)}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`;
    const purchaseResponse = await fetch(purchaseUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    const purchase = await purchaseResponse.json() as GoogleSubscription & { error?: { message?: string } };
    if (!purchaseResponse.ok) throw new Error(purchase.error?.message || `Google Play verification failed (${purchaseResponse.status})`);

    if (purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId !== user.id) {
      return jsonResponse({ error: "This purchase belongs to a different Proof account" }, 403);
    }
    const matchingItems = (purchase.lineItems ?? []).filter((item) => item.productId === productId && item.expiryTime);
    const currentItem = matchingItems.sort((a, b) =>
      new Date(b.expiryTime!).getTime() - new Date(a.expiryTime!).getTime()
    )[0];
    const state = purchase.subscriptionState ?? "SUBSCRIPTION_STATE_UNSPECIFIED";
    if (!currentItem?.expiryTime) {
      return jsonResponse({ error: "Google Play reports that this subscription is not active" }, 402);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const subscription = {
      user_id: user.id,
      provider: "google_play",
      google_play_product_id: productId,
      google_play_purchase_token_hash: await hashToken(purchaseToken),
      plan: GOOGLE_PLAY_PRODUCTS[productId],
      status: googlePlayStatus(state),
      current_period_end: currentItem.expiryTime,
      cancel_at_period_end: currentItem.autoRenewingPlan?.autoRenewEnabled === false,
    };
    const { error: saveError } = await adminClient.from("subscriptions").upsert(subscription);
    if (saveError) throw saveError;

    const grantsAccess = grantsGooglePlayAccess(state, currentItem.expiryTime);
    if (grantsAccess && purchase.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      const acknowledgeUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(GOOGLE_PLAY_PACKAGE_NAME)}/purchases/subscriptions/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
      const acknowledgeResponse = await fetch(acknowledgeUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!acknowledgeResponse.ok) throw new Error(`Google Play acknowledgement failed (${acknowledgeResponse.status})`);
    }

    return jsonResponse({ subscription: {
      plan: subscription.plan,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
      provider: subscription.provider,
    }, grantsAccess });
  } catch (error) {
    console.error("Google Play purchase verification failed", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Purchase verification failed" }, 500);
  }
});