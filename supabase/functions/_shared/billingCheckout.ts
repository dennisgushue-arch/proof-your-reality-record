const STRIPE_PRICE_ID_PATTERN = /^price_[A-Za-z0-9]+$/;
const STRIPE_SECRET_KEY_PATTERN = /^sk_(live|test)_[A-Za-z0-9]+$/;

function isRedacted(value: string) {
  return value.includes("__REDACTED__") || value.toLowerCase().includes("redacted");
}

export function isValidStripeSecretKey(secret?: string | null) {
  if (!secret) return false;
  const candidate = secret.trim();
  return !isRedacted(candidate) && STRIPE_SECRET_KEY_PATTERN.test(candidate);
}

export function isValidStripePriceId(priceId?: string | null) {
  if (!priceId) return false;
  const candidate = priceId.trim();
  return !isRedacted(candidate) && STRIPE_PRICE_ID_PATTERN.test(candidate);
}

export function isUsableStripeDiscountId(value?: string | null) {
  if (!value) return false;
  const candidate = value.trim();
  return Boolean(candidate)
    && !isRedacted(candidate)
    && !isValidStripePriceId(candidate)
    && !/^prod_[A-Za-z0-9]+$/.test(candidate);
}

export function shouldRetryWithoutCoupon(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "";
  return /coupon|discount|promotion code/i.test(message);
}

export function isEarlyAdopterEligible(userCreatedAt: string | null | undefined, launchIso: string) {
  if (!userCreatedAt || !launchIso) return false;
  const userCreated = new Date(userCreatedAt);
  const launch = new Date(launchIso);
  if (Number.isNaN(userCreated.getTime()) || Number.isNaN(launch.getTime())) return false;

  const windowEnd = new Date(launch);
  windowEnd.setUTCMonth(windowEnd.getUTCMonth() + 3);
  return userCreated >= launch && userCreated < windowEnd;
}

export function resolveAllowPromotionCodes(hasAppliedDiscount: boolean, allowPromotionCodes: boolean) {
  return hasAppliedDiscount ? undefined : allowPromotionCodes;
}
