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
  return Boolean(candidate) && !isRedacted(candidate);
}

export function shouldRetryWithoutCoupon(error: unknown) {
  return error instanceof Error && /No such coupon/i.test(error.message);
}

export function resolveAllowPromotionCodes(hasAppliedDiscount: boolean, allowPromotionCodes: boolean) {
  return hasAppliedDiscount ? undefined : allowPromotionCodes;
}
