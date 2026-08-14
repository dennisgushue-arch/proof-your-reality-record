import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BILLING_OFFERS, getBillingOffer } from "@/lib/billing";
import { GOOGLE_PLAY_PRODUCTS, isKnownGooglePlayProduct } from "../../supabase/functions/_shared/googlePlay";
import { purchaseGooglePlayOffer } from "@/lib/googlePlayBilling";
import Pricing from "@/pages/Pricing";

vi.mock("@/contexts/AuthContext.tsx", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    loading: false,
    hasPaidAccess: false,
    subscriptionLoading: false,
    refreshSubscription: vi.fn(),
  }),
}));

vi.mock("@/integrations/supabase/client.ts", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({
        data: { subscription: { plan: "premium", status: "active", current_period_end: new Date(Date.now() + 60_000).toISOString(), provider: "google_play" } },
        error: null,
      }),
    },
  },
}));

vi.mock("@capgo/native-purchases", () => {
  const purchaseProduct = vi.fn().mockResolvedValue({
    purchaseState: "1",
    productIdentifier: "proof01",
    purchaseToken: "tok_123",
  });

  return {
    NativePurchases: {
      isBillingSupported: vi.fn().mockResolvedValue({ isBillingSupported: true }),
      getProducts: vi.fn().mockResolvedValue({
        products: [{
          title: "Premium Monthly",
          priceString: "$7.99",
          identifier: "proof01",
          planIdentifier: "proof01",
          offerId: null,
        }],
      }),
      purchaseProduct,
      manageSubscriptions: vi.fn(),
    },
    PURCHASE_TYPE: { SUBS: "subs", INAPP: "inapp" },
  };
});

vi.mock("@/lib/googlePlayBilling.ts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/googlePlayBilling")>("@/lib/googlePlayBilling");
  return {
    ...actual,
    isGooglePlayApp: () => true,
    loadGooglePlayProducts: async () => [{ offerId: "premium-monthly", priceText: "$7.99", title: "Premium Monthly" }],
  };
});

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

describe("Google Play subscription configuration", () => {
  it("uses the real monthly Play Console IDs", () => {
    const monthly = getBillingOffer("premium-monthly");
    expect(monthly).not.toBeNull();
    expect(monthly?.playProductId).toBe("proof01");
    expect(monthly?.playBasePlanId).toBe("proof01");
  });

  it("does not request stale product IDs", () => {
    expect(BILLING_OFFERS.some((offer) => offer.playProductId === "proof_premium_monthly")).toBe(false);
    expect(BILLING_OFFERS.some((offer) => offer.playBasePlanId === "premium-monthly")).toBe(false);
    expect(BILLING_OFFERS.some((offer) => offer.playProductId === "proof_premium_annual")).toBe(false);
    expect(BILLING_OFFERS.some((offer) => offer.playBasePlanId === "premium-annual")).toBe(false);
  });

  it("accepts the verified Play product and rejects stale values", () => {
    expect(isKnownGooglePlayProduct("proof01")).toBe(true);
    expect(isKnownGooglePlayProduct("proof_premium_monthly")).toBe(false);
    expect(isKnownGooglePlayProduct("proof_premium_annual")).toBe(false);
    expect(GOOGLE_PLAY_PRODUCTS).toHaveProperty("proof01", "premium");
  });

  it("does not show the Unavailable in Play label when proof01 is returned", async () => {
    render(
      <MemoryRouter>
        <Pricing />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText("Unavailable in Play")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Start 7-day trial/i })).toBeEnabled();
  });

  it("uses SUBS when purchasing a Google Play subscription", async () => {
    const offer = getBillingOffer("premium-monthly");
    expect(offer).not.toBeNull();
    await purchaseGooglePlayOffer(offer!, "user-123");

    const { NativePurchases } = await import("@capgo/native-purchases");
    expect(NativePurchases.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({
      productIdentifier: "proof01",
      planIdentifier: "proof01",
      productType: "subs",
    }));
  });
});
