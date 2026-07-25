import { describe, expect, it } from "vitest";
import {
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
    expect(isUsableStripeDiscountId("__REDACTED__")).toBe(false);
    expect(shouldRetryWithoutCoupon(new Error("No such coupon: 'old_coupon'"))).toBe(true);
    expect(shouldRetryWithoutCoupon(new Error("Card declined"))).toBe(false);
  });
});