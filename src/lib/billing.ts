export type BillingPlan = "free" | "pro" | "premium";
export type BillingMode = "subscription" | "prepaid" | "topup";

export type BillingSubscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  provider?: "stripe" | "google_play" | null;
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
  playProductId: string;
  playBasePlanId: string;
};

export const PRO_SUBSCRIPTION_FEATURES = [
  "Unlimited cases",
  "Unlimited incidents",
  "AI Incident Analysis",
  "Entity Intelligence",
  "Timeline Intelligence",
  "Professional PDF exports",
  "Unlimited evidence uploads",
  "Priority support",
  "Future AI features",
];

export const BILLING_OFFERS: BillingOffer[] = [
  {
    id: "premium-monthly",
    plan: "premium",
    title: "Premium Monthly",
    badge: "7-day trial",
    shortCopy: "Full access with automatic monthly renewal and launch discount eligibility.",
    features: PRO_SUBSCRIPTION_FEATURES,
    priceText: "$7.99",
    cadenceText: "/month",
    cta: "Start 7-day trial",
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_MONTHLY",
    billingMode: "subscription",
    accessDays: 30,
    trialDays: 7,
    allowPromotionCodes: true,
    playProductId: "proof_premium_monthly",
    playBasePlanId: "premium-monthly",
  },
  {
    id: "premium-annual",
    plan: "premium",
    title: "Premium Annual",
    badge: "Best value",
    shortCopy: "A lower-maintenance annual subscription for long-running documentation needs.",
    features: [
      "Everything in Pro Subscription",
      "Lower effective monthly cost",
      "Longer uninterrupted access",
    ],
    priceText: "$87.00",
    cadenceText: "/year",
    cta: "Choose annual",
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_ANNUAL",
    billingMode: "subscription",
    accessDays: 365,
    trialDays: 7,
    allowPromotionCodes: true,
    playProductId: "proof_premium_annual",
    playBasePlanId: "premium-annual",
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
  if (subscription.current_period_end) return hasFutureAccess(subscription.current_period_end);
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

  if (!subscription.current_period_end && (subscription.status === "active" || subscription.status === "trialing")) {
    return "Paid access active";
  }

  if (subscription.current_period_end) {
    return `Access expired on ${new Date(subscription.current_period_end).toLocaleDateString()}`;
  }

  return "No active paid access";
}
