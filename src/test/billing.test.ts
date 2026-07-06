import { describe, expect, it } from "vitest";
import { BILLING_OFFERS, describeBillingAccess, getBillingOffer, hasBillingAccess } from "../lib/billing.ts";

describe("billing catalog", () => {
  it("includes subscription, prepaid, and top-up offers", () => {
    expect(BILLING_OFFERS.some((offer) => offer.billingMode === "subscription")).toBe(true);
    expect(BILLING_OFFERS.some((offer) => offer.billingMode === "prepaid")).toBe(true);
    expect(BILLING_OFFERS.some((offer) => offer.billingMode === "topup")).toBe(true);
  });

  it("resolves offer metadata by id", () => {
    const offer = getBillingOffer("premium-annual");
    expect(offer?.billingMode).toBe("subscription");
    expect(offer?.accessDays).toBeGreaterThan(300);
  });
});

describe("billing access", () => {
  it("allows active subscriptions", () => {
    expect(
      hasBillingAccess({
        plan: "premium",
        status: "active",
        current_period_end: "2026-12-31T00:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("allows access when a prepaid period is still in the future", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    expect(
      hasBillingAccess(
        {
          plan: "premium",
          status: "canceled",
          current_period_end: "2026-07-10T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(true);
  });

  it("blocks access when the period has expired", () => {
    const now = new Date("2026-07-15T00:00:00.000Z");
    expect(
      hasBillingAccess(
        {
          plan: "premium",
          status: "canceled",
          current_period_end: "2026-07-10T00:00:00.000Z",
        },
        now,
      ),
    ).toBe(false);
  });

  it("describes the current billing state", () => {
    expect(
      describeBillingAccess({
        plan: "premium",
        status: "active",
        current_period_end: "2026-07-10T00:00:00.000Z",
      }),
    ).toContain("renews");
  });
});
