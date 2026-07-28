import { describe, expect, it } from "vitest";
import {
  isEarlyAdopterEligible,
  isUsableStripeDiscountId,
  isValidStripePriceId,
  isValidStripeSecretKey,
  resolveAllowPromotionCodes,
  shouldRetryWithoutCoupon,
} from "../../supabase/functions/_shared/billingCheckout";

describe("billing checkout safeguards", () => {
  it("accepts real-looking Stripe keys and rejects missing or redacted keys", () => {
    expect(isValidStripeSecretKey("sk_test_abc123")).toBe(true);
    expect(isValidStripeSecretKey("sk_live_abc123")).toBe(true);
    expect(isValidStripeSecretKey("__REDACTED__")).toBe(false);
    expect(isValidStripeSecretKey("")).toBe(false);
  });

  it("requires a Stripe price ID rather than a product ID or placeholder", () => {
    expect(isValidStripePriceId("price_abc123")).toBe(true);
    expect(isValidStripePriceId("prod_abc123")).toBe(false);
    expect(isValidStripePriceId("price_REDACTED")).toBe(false);
  });

  it("never enables promotion-code entry when a fixed coupon is applied", () => {
    expect(resolveAllowPromotionCodes(true, true)).toBeUndefined();
    expect(resolveAllowPromotionCodes(false, true)).toBe(true);
    expect(resolveAllowPromotionCodes(false, false)).toBe(false);
  });

  it("ignores unusable coupons and retries only a missing-coupon Stripe failure", () => {
    expect(isUsableStripeDiscountId("coupon_early_adopter")).toBe(true);
    expect(isUsableStripeDiscountId("STRIPE_COUPON_ID_EARLY_ADOPTER_50")).toBe(true);
    expect(isUsableStripeDiscountId("price_abc123")).toBe(false);
    expect(isUsableStripeDiscountId("prod_abc123")).toBe(false);
    expect(isUsableStripeDiscountId("__REDACTED__")).toBe(false);
    expect(shouldRetryWithoutCoupon(new Error("No such coupon: 'old_coupon'"))).toBe(true);
    expect(shouldRetryWithoutCoupon({ message: "This promotion code is inactive" })).toBe(true);
    expect(shouldRetryWithoutCoupon(new Error("Card declined"))).toBe(false);
  });

  it("limits early-adopter eligibility to the configured three-month launch window", () => {
    const launch = "2026-06-01T00:00:00Z";
    expect(isEarlyAdopterEligible("2026-05-31T23:59:59Z", launch)).toBe(false);
    expect(isEarlyAdopterEligible("2026-06-01T00:00:00Z", launch)).toBe(true);
    expect(isEarlyAdopterEligible("2026-08-31T23:59:59Z", launch)).toBe(true);
    expect(isEarlyAdopterEligible("2026-09-01T00:00:00Z", launch)).toBe(false);
  });
});