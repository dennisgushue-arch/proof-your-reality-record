export type BillingPlan = "free" | "pro" | "premium";
export type BillingMode = "subscription" | "prepaid" | "topup";
export type BillingAudience = "acquire" | "upgrade" | "retain";

export type BillingSubscription = {
  plan: BillingPlan;
  status: string;
  current_period_end: string | null;
};

export type BillingOffer = {
  id: string;
  plan: Exclude<BillingPlan, "free">;
  title: string;
  priceText: string;
  cadenceText: string;
  shortCopy: string;
  features: string[];
  cta: string;
  badge: string;
  billingMode: BillingMode;
  audience: BillingAudience;
  accessDays: number;
  priceEnvKey: string;
  trialDays?: number;
  allowPromotionCodes?: boolean;
};

export const BILLING_OFFERS: BillingOffer[] = [
  {
    id: "pro-monthly",
    plan: "pro",
    title: "Pro monthly",
    priceText: "$7.99",
    cadenceText: "/month",
    shortCopy: "Essential Pro access for individuals who need stronger capture and prep tools at a lower monthly price.",
    features: [
      "Auto-renews each month",
      "Prepare Me access",
      "Contradiction analysis and guided prep",
      "Private case timeline and export essentials",
    ],
    cta: "Start Pro monthly",
    badge: "Pro plan",
    billingMode: "subscription",
    audience: "acquire",
    accessDays: 30,
    priceEnvKey: "STRIPE_PRICE_ID_PRO",
    trialDays: 7,
    allowPromotionCodes: true,
  },
  {
    id: "premium-monthly",
    plan: "premium",
    title: "Premium monthly",
    priceText: "$14.99",
    cadenceText: "/month",
    shortCopy: "Best for new subscribers who want to start with a trial and upgrade later.",
    features: [
      "7-day free trial for brand-new accounts",
      "Auto-renews each month",
      "Contradiction analysis and guided prep",
      "Collaborative case access and advanced exports",
    ],
    cta: "Start monthly trial",
    badge: "Acquisition offer",
    billingMode: "subscription",
    audience: "acquire",
    accessDays: 30,
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_MONTHLY",
    trialDays: 7,
    allowPromotionCodes: true,
  },
  {
    id: "premium-annual",
    plan: "premium",
    title: "Premium annual",
    priceText: "$139.99",
    cadenceText: "/year",
    shortCopy: "A lower effective monthly price for subscribers ready to commit.",
    features: [
      "Auto-renews yearly",
      "Lower effective monthly cost",
      "Keeps premium features active without interruption",
      "Great for teams or long cases",
    ],
    cta: "Choose annual",
    badge: "Upgrade saver",
    billingMode: "subscription",
    audience: "upgrade",
    accessDays: 365,
    priceEnvKey: "STRIPE_PRICE_ID_PREMIUM_ANNUAL",
    trialDays: 14,
    allowPromotionCodes: true,
  },
  {
    id: "premium-prepaid-90",
    plan: "premium",
    title: "Premium prepaid 90-day plan",
    priceText: "$119",
    cadenceText: "for 90 days",
    shortCopy: "Prepay for a fixed block of access when you want no auto-renewal.",
    features: [
      "No recurring charge",
      "Access lasts for the full prepaid period",
      "Ideal for short investigations or seasonal work",
      "Can be topped up later if needed",
    ],
    cta: "Buy prepaid access",
    badge: "Prepaid plan",
    billingMode: "prepaid",
    audience: "retain",
    accessDays: 90,
    priceEnvKey: "STRIPE_PRICE_ID_PREPAID_90",
    allowPromotionCodes: false,
  },
  {
    id: "premium-prepaid-365",
    plan: "premium",
    title: "Premium prepaid annual plan",
    priceText: "$349",
    cadenceText: "for 365 days",
    shortCopy: "Lock in a year of access without turning on auto-renewing billing.",
    features: [
      "No auto-renew",
      "Strong annual savings versus the monthly path",
      "Useful for long-running cases and repeat users",
      "Can be renewed manually before expiry",
    ],
    cta: "Prepay for a year",
    badge: "Best prepaid value",
    billingMode: "prepaid",
    audience: "retain",
    accessDays: 365,
    priceEnvKey: "STRIPE_PRICE_ID_PREPAID_365",
    allowPromotionCodes: false,
  },
  {
    id: "premium-topup-30",
    plan: "premium",
    title: "30-day access top-up",
    priceText: "$15",
    cadenceText: "+30 days",
    shortCopy: "Extend an existing prepaid or active account without switching billing models.",
    features: [
      "Keeps access rolling forward",
      "No new subscription commitment",
      "Works well between renewals or while waiting on a case to close",
      "Great for existing subscribers who want a little more time",
    ],
    cta: "Add 30 days",
    badge: "Top-up",
    billingMode: "topup",
    audience: "upgrade",
    accessDays: 30,
    priceEnvKey: "STRIPE_PRICE_ID_TOPUP_30",
    allowPromotionCodes: false,
  },
];

const ACTIVE_STATUSES = new Set(["active", "trialing"]);
const ACCESS_GRACE_STATUSES = new Set(["past_due", "unpaid", "canceling"]);

export function getBillingOffer(offerId: string) {
  return BILLING_OFFERS.find((offer) => offer.id === offerId) ?? null;
}

export function isPremiumBillingPlan(plan: BillingPlan | null | undefined) {
  return plan === "pro" || plan === "premium";
}

export function hasBillingAccess(subscription?: BillingSubscription | null, now = new Date()) {
  if (!subscription || !isPremiumBillingPlan(subscription.plan)) return false;

  if (ACTIVE_STATUSES.has(subscription.status)) return true;

  if (subscription.current_period_end) {
    const end = new Date(subscription.current_period_end);
    if (!Number.isNaN(end.getTime()) && end.getTime() > now.getTime()) {
      return true;
    }
  }

  return ACCESS_GRACE_STATUSES.has(subscription.status)
    ? Boolean(subscription.current_period_end && new Date(subscription.current_period_end).getTime() > now.getTime())
    : false;
}

export function describeBillingAccess(subscription?: BillingSubscription | null) {
  if (!subscription || !isPremiumBillingPlan(subscription.plan)) return "Free";

  if (subscription.current_period_end) {
    const end = new Date(subscription.current_period_end);
    if (!Number.isNaN(end.getTime())) {
      const suffix = ACTIVE_STATUSES.has(subscription.status) ? "renews" : "expires";
      return `${subscription.plan.toUpperCase()} ${suffix} ${end.toLocaleDateString()}`;
    }
  }

  return `${subscription.plan.toUpperCase()} · ${subscription.status}`;
}

export function resolveBillingCheckoutMode(offer: BillingOffer) {
  return offer.billingMode === "subscription" ? "subscription" : "payment";
}
