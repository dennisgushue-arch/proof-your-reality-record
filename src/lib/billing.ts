export type BillingPlan = "free" | "pro" | "premium";
export type BillingMode = "subscription" | "prepaid" | "topup";

export type BillingSubscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
};

export type BillingOffer = {
  id: string;
  plan: BillingPlan;
  title: string;
  badge: string;
  shortCopy: string;
  features: string[];
  priceText: string;
  cadenceText: string;
  cta: string;
  priceEnvKey: string;
  billingMode: BillingMode;
  accessDays: number;
  trialDays?: number;
  allowPromotionCodes?: boolean;
};

export const BILLING_OFFERS: BillingOffer[] = [
  {
    id: "premium-monthly",
    plan: "premium",
    title: "Premium Monthly",
    badge: "7-day trial",
    shortCopy: "Full access with automatic monthly renewal and launch discount eligibility.",
    features: [
      "Unlimited cases & incidents",
      "AI structuring & summaries",
      "PDF evidence export",
      "Prepare Me access",
      "7-day free trial for new users",
    ],
    priceText: "$13.99",
    cadenceText: "/month",
    cta: "Start 7-day trial",
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_MONTHLY",
    billingMode: "subscription",
    accessDays: 30,
    trialDays: 7,
    allowPromotionCodes: true,
  },
  {
    id: "premium-annual",
    plan: "premium",
    title: "Premium Annual",
    badge: "Best value",
    shortCopy: "A lower-maintenance annual subscription for long-running documentation needs.",
    features: [
      "Everything in Premium Monthly",
      "Lower effective monthly cost",
      "Longer uninterrupted access",
    ],
    priceText: "$119",
    cadenceText: "/year",
    cta: "Choose annual",
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_ANNUAL",
    billingMode: "subscription",
    accessDays: 365,
    trialDays: 7,
    allowPromotionCodes: true,
  },
  {
    id: "prepaid-90",
    plan: "premium",
    title: "90-Day Prepaid Access",
    badge: "Prepaid",
    shortCopy: "One-time payment for three months of access without auto-renewal.",
    features: [
      "Fixed access window",
      "No auto-renewal",
      "Works well for short case cycles",
    ],
    priceText: "$39",
    cadenceText: "one time",
    cta: "Buy 90 days",
    priceEnvKey: "STRIPE_PRICE_ID_PREPAID_90",
    billingMode: "prepaid",
    accessDays: 90,
    allowPromotionCodes: true,
  },
  {
    id: "prepaid-365",
    plan: "premium",
    title: "365-Day Prepaid Access",
    badge: "Annual prepaid",
    shortCopy: "A one-time annual access option for users who prefer prepaid billing.",
    features: [
      "One-time yearly access",
      "No renewal surprise",
      "Ideal for planned long-term use",
    ],
    priceText: "$129",
    cadenceText: "one time",
    cta: "Buy 1 year",
    priceEnvKey: "STRIPE_PRICE_ID_PREPAID_365",
    billingMode: "prepaid",
    accessDays: 365,
    allowPromotionCodes: true,
  },
  {
    id: "topup-30",
    plan: "premium",
    title: "30-Day Top-up",
    badge: "Top-up",
    shortCopy: "Extend an active case with an extra 30 days of access.",
    features: [
      "Adds time to current access",
      "Great for case overruns",
      "No subscription required",
    ],
    priceText: "$12",
    cadenceText: "one time",
    cta: "Add 30 days",
    priceEnvKey: "STRIPE_PRICE_ID_TOPUP_30",
    billingMode: "topup",
    accessDays: 30,
    allowPromotionCodes: true,
  },
];

export function getBillingOffer(id: string) {
  return BILLING_OFFERS.find((offer) => offer.id === id) ?? null;
}

export function resolveBillingCheckoutMode(offer: BillingOffer): "subscription" | "payment" {
  return offer.billingMode === "subscription" ? "subscription" : "payment";
}

function hasFutureAccess(currentPeriodEnd: string | null | undefined) {
  if (!currentPeriodEnd) return false;
  const time = new Date(currentPeriodEnd).getTime();
  return Number.isFinite(time) && time > Date.now();
}

export function hasBillingAccess(subscription: BillingSubscription | null | undefined) {
  if (!subscription) return false;
  if (subscription.plan !== "pro" && subscription.plan !== "premium") return false;
  if (hasFutureAccess(subscription.current_period_end)) return true;
  return subscription.status === "active" || subscription.status === "trialing";
}

export function describeBillingAccess(subscription: BillingSubscription | null | undefined) {
  if (!subscription || subscription.plan === "free") {
    return "Free plan · basic access only";
  }

  if (hasFutureAccess(subscription.current_period_end)) {
    const dateLabel = new Date(subscription.current_period_end as string).toLocaleDateString();

    if (subscription.status === "trialing") {
      return `Trial access through ${dateLabel}`;
    }

    return `Paid access through ${dateLabel}`;
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    return "Paid access active";
  }

  if (subscription.current_period_end) {
    return `Access expired on ${new Date(subscription.current_period_end).toLocaleDateString()}`;
  }

  return "No active paid access";
}
