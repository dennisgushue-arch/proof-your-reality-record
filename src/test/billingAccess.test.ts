import { describe, expect, it } from "vitest";
import { describeBillingAccess, hasBillingAccess, type BillingSubscription } from "@/lib/billing";
import { canCreateCase, canCreateIncident, currentUtcMonthRange } from "@/lib/planLimits";

function subscription(overrides: Partial<BillingSubscription> = {}): BillingSubscription {
  return {
    plan: "premium",
    status: "active",
    current_period_end: new Date(Date.now() + 60_000).toISOString(),
    provider: "google_play",
    ...overrides,
  };
}

describe("billing access lifecycle", () => {
  it("unlocks Pro while an active subscription has future access", () => {
    expect(hasBillingAccess(subscription())).toBe(true);
  });

  it("keeps access after cancellation until the paid period ends", () => {
    expect(hasBillingAccess(subscription({ status: "canceled" }))).toBe(true);
  });

  it("reverts to Free after period end even if a stale status still says active", () => {
    const expired = subscription({ current_period_end: new Date(Date.now() - 60_000).toISOString() });
    expect(hasBillingAccess(expired)).toBe(false);
    expect(describeBillingAccess(expired)).toMatch(/^Access expired on /);
  });

  it("supports legacy active records only when no period end exists", () => {
    expect(hasBillingAccess(subscription({ current_period_end: null }))).toBe(true);
    expect(hasBillingAccess(subscription({ current_period_end: null, status: "inactive" }))).toBe(false);
  });
});

describe("Free plan limits", () => {
  it("allows one case and one monthly incident on Free, while Pro is unlimited", () => {
    expect(canCreateCase(0, false)).toBe(true);
    expect(canCreateCase(1, false)).toBe(false);
    expect(canCreateCase(20, true)).toBe(true);
    expect(canCreateIncident(0, false)).toBe(true);
    expect(canCreateIncident(1, false)).toBe(false);
    expect(canCreateIncident(20, true)).toBe(true);
  });

  it("uses UTC calendar-month boundaries", () => {
    expect(currentUtcMonthRange(new Date("2026-12-31T23:59:59Z"))).toEqual({
      start: "2026-12-01T00:00:00.000Z",
      end: "2027-01-01T00:00:00.000Z",
    });
  });
});
