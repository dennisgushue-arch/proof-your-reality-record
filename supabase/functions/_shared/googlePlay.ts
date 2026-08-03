export const GOOGLE_PLAY_PACKAGE_NAME = "com.proofyourreality.record";

export const GOOGLE_PLAY_PRODUCTS = {
  proof_premium_monthly: "premium",
  proof_premium_annual: "premium",
} as const;

export type GoogleSubscriptionState =
  | "SUBSCRIPTION_STATE_ACTIVE"
  | "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
  | "SUBSCRIPTION_STATE_CANCELED"
  | string;

export function isKnownGooglePlayProduct(productId: string): productId is keyof typeof GOOGLE_PLAY_PRODUCTS {
  return Object.hasOwn(GOOGLE_PLAY_PRODUCTS, productId);
}

export function grantsGooglePlayAccess(state: GoogleSubscriptionState, expiryTime: string, now = Date.now()) {
  const expiry = new Date(expiryTime).getTime();
  if (!Number.isFinite(expiry) || expiry <= now) return false;
  return state === "SUBSCRIPTION_STATE_ACTIVE"
    || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD"
    || state === "SUBSCRIPTION_STATE_CANCELED";
}

export function googlePlayStatus(state: GoogleSubscriptionState) {
  if (state === "SUBSCRIPTION_STATE_ACTIVE") return "active";
  if (state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD") return "past_due";
  if (state === "SUBSCRIPTION_STATE_CANCELED") return "canceled";
  return "inactive";
}