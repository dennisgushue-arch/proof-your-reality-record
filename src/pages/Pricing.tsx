import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { AppHeader } from "../components/AppHeader.tsx";
import { Disclaimer } from "../components/Disclaimer.tsx";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.tsx";
import { TrustPanel } from "../features/release-v1/components/TrustPanel.tsx";
import { UpgradePanel } from "../features/release-v1/components/UpgradePanel.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { BILLING_OFFERS, PRO_SUBSCRIPTION_FEATURES, describeBillingAccess, getBillingOffer } from "../lib/billing.ts";
import { getFunctionErrorMessage } from "../lib/functionError.ts";
import {
  isGooglePlayApp,
  loadGooglePlayProducts,
  purchaseGooglePlayOffer,
  type GooglePlayProduct,
} from "../lib/googlePlayBilling.ts";

const freePlanFeatures = [
  "Create 1 case",
  "Record 10 incidents total",
  "Basic timeline",
  "View saved records",
];

const POST_UPGRADE_REDIRECT_STORAGE_KEY = "proof.post-upgrade-redirect";

function sanitizeRedirectTarget(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

const Pricing = () => {
  const { user, loading, hasPaidAccess, subscriptionLoading, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");
  const subscriptionRequired = searchParams.get("reason") === "subscription-required";
  const queryRedirectAfterUpgrade = sanitizeRedirectTarget(searchParams.get("redirect"));
  const [storedRedirectAfterUpgrade, setStoredRedirectAfterUpgrade] = useState<string | null>(null);
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);
  const [playProducts, setPlayProducts] = useState<GooglePlayProduct[]>([]);
  const usesGooglePlay = isGooglePlayApp();
  const premiumOffers = BILLING_OFFERS.filter((offer) =>
    offer.billingMode === "subscription" && (!usesGooglePlay || Boolean(offer.playProductId && offer.playBasePlanId))
  );
  const redirectAfterUpgrade = queryRedirectAfterUpgrade ?? storedRedirectAfterUpgrade;

  useEffect(() => {
    const stored = sanitizeRedirectTarget(globalThis.sessionStorage?.getItem(POST_UPGRADE_REDIRECT_STORAGE_KEY) ?? null);
    if (stored) setStoredRedirectAfterUpgrade(stored);
  }, []);

  useEffect(() => {
    if (!subscriptionRequired || !queryRedirectAfterUpgrade) return;
    globalThis.sessionStorage?.setItem(POST_UPGRADE_REDIRECT_STORAGE_KEY, queryRedirectAfterUpgrade);
    setStoredRedirectAfterUpgrade(queryRedirectAfterUpgrade);
  }, [queryRedirectAfterUpgrade, subscriptionRequired]);

  useEffect(() => {
    if (subscriptionRequired || checkoutStatus || queryRedirectAfterUpgrade) return;
    globalThis.sessionStorage?.removeItem(POST_UPGRADE_REDIRECT_STORAGE_KEY);
    setStoredRedirectAfterUpgrade(null);
  }, [checkoutStatus, queryRedirectAfterUpgrade, subscriptionRequired]);

  useEffect(() => {
    if (!usesGooglePlay) return;
    loadGooglePlayProducts()
      .then(setPlayProducts)
      .catch((error) => toast.error("Google Play products unavailable", {
        description: error instanceof Error ? error.message : "Try again after installing the app from Google Play.",
      }));
  }, [usesGooglePlay]);

  useEffect(() => {
    if (!checkoutStatus) return;

    if (checkoutStatus === "success") {
      toast.success("Purchase complete", { description: "Your access is being updated. Refresh the account page if it does not appear immediately." });
    }

    if (checkoutStatus === "canceled") {
      toast.message("Checkout canceled", { description: "No changes were made to your subscription." });
    }

    setSearchParams((prev) => {
      prev.delete("checkout");
      return prev;
    }, { replace: true });
  }, [checkoutStatus, setSearchParams]);

  useEffect(() => {
    if (!subscriptionRequired || !redirectAfterUpgrade) return;
    if (subscriptionLoading) return;
    if (!hasPaidAccess) return;

    toast.success("Subscription active", {
      description: "Taking you back to your previous page.",
    });
    globalThis.sessionStorage?.removeItem(POST_UPGRADE_REDIRECT_STORAGE_KEY);
    setStoredRedirectAfterUpgrade(null);
    navigate(redirectAfterUpgrade, { replace: true });
  }, [hasPaidAccess, navigate, redirectAfterUpgrade, subscriptionLoading, subscriptionRequired]);

  const goBackAfterUpgrade = () => {
    if (!redirectAfterUpgrade) return;
    navigate(redirectAfterUpgrade);
  };

  const startCheckout = async (offerId: string) => {
    const offer = getBillingOffer(offerId);
    if (!offer) {
      toast.error("Could not start checkout", { description: "That billing option is unavailable." });
      return;
    }

    try {
      setLoadingOfferId(offerId);

      if (usesGooglePlay) {
        if (!user) {
          toast.message("Sign in required", { description: "Create an account or sign in before subscribing." });
          navigate("/auth?mode=signup");
          return;
        }
        if (redirectAfterUpgrade) {
          globalThis.sessionStorage?.setItem(POST_UPGRADE_REDIRECT_STORAGE_KEY, redirectAfterUpgrade);
          setStoredRedirectAfterUpgrade(redirectAfterUpgrade);
        }
        await purchaseGooglePlayOffer(offer, user.id);
        await refreshSubscription();
        toast.success("Subscription active", { description: "Google Play verified your Premium access." });
        navigate(redirectAfterUpgrade ?? "/account");
        return;
      }

      if (redirectAfterUpgrade) {
        globalThis.sessionStorage?.setItem(POST_UPGRADE_REDIRECT_STORAGE_KEY, redirectAfterUpgrade);
        setStoredRedirectAfterUpgrade(redirectAfterUpgrade);
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { offerId },
      });

      if (error) {
        const message = await getFunctionErrorMessage(error, "Please verify Stripe configuration and try again.");
        if (/missing authorization|unauthorized|jwt|sign in|signin/i.test(message)) {
          toast.message("Sign in required", { description: "Create an account or sign in to start checkout." });
          navigate("/auth?mode=signup");
          return;
        }

        toast.error("Could not start checkout", {
          description: message,
        });
        return;
      }

      if (!data?.url) {
        toast.error("Could not start checkout", {
          description: "No checkout URL was returned. Please verify Stripe configuration and try again.",
        });
        return;
      }

      globalThis.location.assign(data.url as string);
    } catch (err) {
      toast.error("Could not start checkout", {
        description: err instanceof Error ? err.message : "Unexpected network error.",
      });
    } finally {
      setLoadingOfferId(null);
    }
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-balance">Private, straightforward pricing</h1>
          <p className="mt-4 text-muted-foreground">
            Choose the plan that fits your workflow with two premium subscription options.
          </p>
        </div>
        {subscriptionRequired && (
          <div className="mt-6 max-w-3xl mx-auto rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
            <p className="font-medium text-foreground">Proof found insights that require Premium.</p>
            <p className="mt-1 text-muted-foreground">
              Your saved records stay exactly where they are. Premium unlocks deeper analysis, patterns, possible statement differences, relationship intelligence, and professional exports across your record.
              {redirectAfterUpgrade ? " You can return to your previous page after subscribing." : ""}
            </p>
            {redirectAfterUpgrade && (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBackAfterUpgrade}
                  disabled={subscriptionLoading || !hasPaidAccess}
                >
                  {subscriptionLoading
                    ? "Checking subscription…"
                    : hasPaidAccess
                      ? "Return after upgrade"
                      : "Return after upgrade (available once active)"}
                </Button>
              </div>
            )}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">Private by default. No public sharing, and no hidden fees.</p>
        <p className="mt-2 text-center text-xs text-muted-foreground">Early user discount applies to accounts created during the first 3 months after launch.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 max-w-6xl mx-auto items-stretch">
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-card h-full flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Free Plan</p>
            <p className="mt-3 text-sm text-muted-foreground">Start building your first private record for free.</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{feature}</span></li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-accent/40 bg-accent/5 p-5 sm:p-7 shadow-card h-full flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Pro Subscription</p>
            <p className="mt-3 text-sm text-muted-foreground">Unlock patterns, inconsistencies, connections, and professional reports across your complete record.</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {PRO_SUBSCRIPTION_FEATURES.map((feature) => (
                <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{feature}</span></li>
              ))}
            </ul>
          </section>
        </div>
        <div className="mt-10 sm:mt-12 grid gap-5 sm:gap-6 md:grid-cols-3 max-w-6xl mx-auto items-stretch">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-card h-full flex flex-col">
            <h2 className="text-xl font-semibold">Free Plan</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-semibold">$0</span>
              <span className="text-muted-foreground text-sm">forever</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {freePlanFeatures.map((feature) => (
                <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{feature}</span></li>
              ))}
            </ul>
            <Button asChild className="w-full mt-auto pt-7 sm:pt-8 h-11">
              <Link to={user ? "/dashboard" : "/auth?mode=signup"}>{user ? "Go to dashboard" : "Get started free"}</Link>
            </Button>
          </div>

          {premiumOffers.map((offer, index) => {
            const highlighted = index === 0;
            const playProduct = playProducts.find((product) => product.offerId === offer.id);

            return (
              <div
                key={offer.id}
                className={[
                  "rounded-2xl bg-card p-5 sm:p-7 h-full flex flex-col",
                  highlighted
                    ? "border border-accent shadow-elevated ring-1 ring-accent/30"
                    : "border border-border shadow-card",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={[
                        "text-xs font-semibold uppercase tracking-wider",
                        highlighted ? "text-accent" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {offer.badge}
                    </div>
                    <h2 className="mt-1 text-xl font-semibold">{offer.title}</h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold leading-none">{playProduct?.priceText ?? offer.priceText}</div>
                    <div className="text-sm text-muted-foreground mt-1">{offer.cadenceText}</div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{offer.shortCopy}</p>

                <ul className="mt-5 space-y-2.5 text-sm">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{feature}</span></li>
                  ))}
                </ul>

                <Button
                  className="w-full mt-auto pt-6 h-11"
                  variant={highlighted ? "default" : "outline"}
                  onClick={() => startCheckout(offer.id)}
                  disabled={loading || loadingOfferId !== null || (usesGooglePlay && !playProduct)}
                >
                  {loading
                    ? "Checking session…"
                    : loadingOfferId === offer.id
                      ? usesGooglePlay ? "Opening Google Play…" : "Redirecting…"
                      : usesGooglePlay && !playProduct ? "Unavailable in Play" : offer.cta}
                </Button>
              </div>
            );
          })}

        </div>
        <div className="mt-8 max-w-5xl mx-auto grid gap-4 md:grid-cols-[1fr_1fr]">
          <TrustPanel />
          <UpgradePanel description={usesGooglePlay
            ? "Subscribe securely through Google Play when you need supported premium features."
            : "Upgrade through the existing Stripe checkout flow when you need supported premium features."} />
        </div>
        <div className="mt-8 max-w-5xl mx-auto rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">What your account will show</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Premium plans renew automatically and your current access date is always shown in your account.
              </p>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              <div>{describeBillingAccess({ plan: "free", status: "inactive", current_period_end: null })}</div>
              <div>Upgrade and renew any time from the account screen.</div>
            </div>
          </div>
        </div>
        <div className="mt-12 max-w-3xl mx-auto"><Disclaimer /></div>
      </main>
    </div>
  );
};

export default Pricing;
