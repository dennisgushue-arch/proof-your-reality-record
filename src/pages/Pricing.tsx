import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  Check,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { AppHeader } from "../components/AppHeader.tsx";
import { Disclaimer } from "../components/Disclaimer.tsx";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.tsx";
import { TrustPanel } from "../features/release-v1/components/TrustPanel.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { trackProductEvent } from "@/lib/productAnalytics";
import {
  BILLING_OFFERS,
  PRO_SUBSCRIPTION_FEATURES,
  describeBillingAccess,
  getBillingOffer,
} from "../lib/billing.ts";
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
  const {
    user,
    loading,
    hasPaidAccess,
    subscriptionLoading,
    refreshSubscription,
  } = useAuth();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const checkoutStatus = searchParams.get("checkout");
  const subscriptionRequired =
    searchParams.get("reason") === "subscription-required";

  const queryRedirectAfterUpgrade = sanitizeRedirectTarget(
    searchParams.get("redirect"),
  );

  const [storedRedirectAfterUpgrade, setStoredRedirectAfterUpgrade] =
    useState<string | null>(null);

  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);
  const [playProducts, setPlayProducts] = useState<GooglePlayProduct[]>([]);

  const usesGooglePlay = isGooglePlayApp();

  const premiumOffers = BILLING_OFFERS.filter(
    (offer) =>
      offer.id === "premium-monthly" &&
      offer.billingMode === "subscription" &&
      (!usesGooglePlay ||
        Boolean(offer.playProductId && offer.playBasePlanId)),
  );

  const redirectAfterUpgrade =
    queryRedirectAfterUpgrade ?? storedRedirectAfterUpgrade;

  useEffect(() => {
    if (!user) return;

    void trackProductEvent("pricing_viewed", {
      source: subscriptionRequired ? "upgrade_prompt" : "pricing_page",
    });
  }, [user, subscriptionRequired]);

  useEffect(() => {
    const stored = sanitizeRedirectTarget(
      globalThis.sessionStorage?.getItem(
        POST_UPGRADE_REDIRECT_STORAGE_KEY,
      ) ?? null,
    );

    if (stored) setStoredRedirectAfterUpgrade(stored);
  }, []);

  useEffect(() => {
    if (!subscriptionRequired || !queryRedirectAfterUpgrade) return;

    globalThis.sessionStorage?.setItem(
      POST_UPGRADE_REDIRECT_STORAGE_KEY,
      queryRedirectAfterUpgrade,
    );

    setStoredRedirectAfterUpgrade(queryRedirectAfterUpgrade);
  }, [queryRedirectAfterUpgrade, subscriptionRequired]);

  useEffect(() => {
    if (
      subscriptionRequired ||
      checkoutStatus ||
      queryRedirectAfterUpgrade
    ) {
      return;
    }

    globalThis.sessionStorage?.removeItem(
      POST_UPGRADE_REDIRECT_STORAGE_KEY,
    );

    setStoredRedirectAfterUpgrade(null);
  }, [checkoutStatus, queryRedirectAfterUpgrade, subscriptionRequired]);

  useEffect(() => {
    if (!usesGooglePlay) return;

    loadGooglePlayProducts()
      .then(setPlayProducts)
      .catch((error) =>
        toast.error("Google Play products unavailable", {
          description:
            error instanceof Error
              ? error.message
              : "Try again after installing the app from Google Play.",
        }),
      );
  }, [usesGooglePlay]);

  useEffect(() => {
    if (!checkoutStatus) return;

    if (checkoutStatus === "success") {
      toast.success("Purchase complete", {
        description:
          "Your Premium access is being updated.",
      });

      void refreshSubscription();
    }

    if (checkoutStatus === "canceled") {
      toast.message("Checkout canceled", {
        description: "No changes were made to your subscription.",
      });
    }

    setSearchParams(
      (prev) => {
        prev.delete("checkout");
        return prev;
      },
      { replace: true },
    );
  }, [checkoutStatus, refreshSubscription, setSearchParams]);

  useEffect(() => {
    if (!subscriptionRequired || !redirectAfterUpgrade) return;
    if (subscriptionLoading) return;
    if (!hasPaidAccess) return;

    toast.success("Subscription active", {
      description: "Taking you back to your previous page.",
    });

    globalThis.sessionStorage?.removeItem(
      POST_UPGRADE_REDIRECT_STORAGE_KEY,
    );

    setStoredRedirectAfterUpgrade(null);

    navigate(redirectAfterUpgrade, { replace: true });
  }, [
    hasPaidAccess,
    navigate,
    redirectAfterUpgrade,
    subscriptionLoading,
    subscriptionRequired,
  ]);

  const startCheckout = async (offerId: string) => {
    const offer = getBillingOffer(offerId);

    if (!offer) {
      toast.error("Could not start checkout", {
        description: "That billing option is unavailable.",
      });
      return;
    }

    if (!user) {
      toast.message("Sign in required", {
        description:
          "Create an account or sign in before subscribing.",
      });

      navigate("/auth?mode=signup&redirect=/pricing");
      return;
    }

    try {
      setLoadingOfferId(offerId);

      if (redirectAfterUpgrade) {
        globalThis.sessionStorage?.setItem(
          POST_UPGRADE_REDIRECT_STORAGE_KEY,
          redirectAfterUpgrade,
        );

        setStoredRedirectAfterUpgrade(redirectAfterUpgrade);
      }

      await trackProductEvent("checkout_started", {
        offer_id: offer.id,
        plan: offer.plan,
        billing_mode: offer.billingMode,
        source: subscriptionRequired
          ? "upgrade_prompt"
          : "pricing_page",
      });

      if (usesGooglePlay) {
        await purchaseGooglePlayOffer(offer, user.id);
        await refreshSubscription();

        toast.success("Subscription active", {
          description:
            "Google Play verified your Proof Plus access.",
        });

        navigate(redirectAfterUpgrade ?? "/account");
        return;
      }

      const checkoutAttemptId = crypto.randomUUID();

      const { data, error } = await supabase.functions.invoke(
        "create-checkout-session",
        {
          body: {
            offerId,
            checkoutAttemptId,
          },
        },
      );

      if (error) {
        const message = await getFunctionErrorMessage(
          error,
          "Please verify Stripe configuration and try again.",
        );

        if (
          /missing authorization|unauthorized|jwt|sign in|signin/i.test(
            message,
          )
        ) {
          toast.message("Sign in required", {
            description:
              "Create an account or sign in to start checkout.",
          });

          navigate("/auth?mode=signup&redirect=/pricing");
          return;
        }

        toast.error("Could not start checkout", {
          description: message,
        });

        return;
      }

      if (!data?.url) {
        toast.error("Could not start checkout", {
          description:
            "No checkout URL was returned. Please try again.",
        });

        return;
      }

      globalThis.location.assign(data.url as string);
    } catch (error) {
      toast.error("Could not start checkout", {
        description:
          error instanceof Error
            ? error.message
            : "Unexpected network error.",
      });
    } finally {
      setLoadingOfferId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />

      <main>
        {/* HERO */}
        <section className="border-b">
          <div className="container mx-auto px-6 py-16 text-center md:py-24">
            <div className="mx-auto mb-6 flex w-fit items-center gap-2 rounded-full border bg-muted/50 px-4 py-2 text-sm">
              <Shield className="h-4 w-4" />
              Protect the details that matter
            </div>

            <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Don&apos;t wait until
              <span className="block text-primary">
                you need the record.
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Proof helps you document, organize, and understand important
              events while the details are still clear.
            </p>
          </div>
        </section>

        {subscriptionRequired && (
          <div className="container mx-auto mt-8 max-w-3xl px-6">
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm">
              <p className="font-medium">
                Proof Plus is required to continue.
              </p>

              <p className="mt-1 text-muted-foreground">
                Upgrade to unlock the full intelligence and documentation
                tools.
              </p>
            </div>
          </div>
        )}

        {/* PRICING */}
        <section className="container mx-auto max-w-6xl px-6 py-16 md:py-24">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* FREE */}
            <div className="rounded-3xl border bg-card p-8 shadow-sm">
              <h2 className="text-2xl font-bold">Start with Proof</h2>

              <p className="mt-2 text-muted-foreground">
                Experience the core documentation workflow for free.
              </p>

              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-bold">$0</span>
                <span className="mb-1 text-muted-foreground">
                  forever
                </span>
              </div>

              <div className="mt-8 space-y-4">
                {freePlanFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3"
                  >
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                variant="outline"
                className="mt-10 w-full"
              >
                <Link
                  to={
                    user
                      ? "/dashboard"
                      : "/auth?mode=signup"
                  }
                >
                  {user ? "Go to Dashboard" : "Start Free"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* PLUS */}
            {premiumOffers.map((offer) => {
              const playProduct = playProducts.find(
                (product) => product.offerId === offer.id,
              );

              const displayPrice =
                playProduct?.priceText ?? "$7.99";

              return (
                <div
                  key={offer.id}
                  className="relative rounded-3xl border-2 border-primary bg-card p-8 shadow-xl"
                >
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-lg">
                      <Sparkles className="h-4 w-4" />
                      PROOF PLUS
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-primary/10 p-3">
                        <Brain className="h-6 w-6 text-primary" />
                      </div>

                      <div>
                        <h2 className="text-2xl font-bold">
                          Proof Plus
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Build the complete record
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 text-muted-foreground">
                      Don&apos;t rely on memory when the details matter.
                      Proof Plus helps preserve your complete record,
                      uncover patterns across events, and keep important
                      evidence organized over time.
                    </p>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-5xl font-bold">
                        {displayPrice}
                      </span>
                      <span className="mb-1 text-muted-foreground">
                        / month
                      </span>
                    </div>

                    <p className="mt-3 text-sm font-medium text-primary">
                      Less than 27¢ a day.
                    </p>

                    <div className="mt-8 space-y-4">
                      {PRO_SUBSCRIPTION_FEATURES.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-3"
                        >
                          <Check className="h-5 w-5 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      className="mt-10 w-full text-base"
                      onClick={() =>
                        startCheckout(offer.id)
                      }
                      disabled={
                        loading ||
                        loadingOfferId !== null ||
                        (usesGooglePlay && !playProduct)
                      }
                    >
                      {loading
                        ? "Checking session..."
                        : loadingOfferId === offer.id
                          ? usesGooglePlay
                            ? "Opening Google Play..."
                            : "Opening secure checkout..."
                          : usesGooglePlay && !playProduct
                            ? "Unavailable in Google Play"
                            : "Get Proof Plus — $7.99/month"}
                    </Button>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                      Cancel anytime.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* VALUE */}
        <section className="border-y bg-muted/30">
          <div className="container mx-auto max-w-5xl px-6 py-20 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              Your record becomes more valuable over time.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Individual incidents matter. Patterns, chronology, and
              context make the complete record much more useful.
            </p>

            <div className="mt-12 grid gap-6 text-left md:grid-cols-3">
              <div className="rounded-2xl border bg-background p-6">
                <h3 className="font-bold">
                  See Patterns
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Identify recurring behaviors and connections across
                  events.
                </p>
              </div>

              <div className="rounded-2xl border bg-background p-6">
                <h3 className="font-bold">
                  Prepare Better
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Review your history before important or difficult
                  interactions.
                </p>
              </div>

              <div className="rounded-2xl border bg-background p-6">
                <h3 className="font-bold">
                  Preserve Context
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Keep dates, people, evidence, and prior incidents
                  connected.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto max-w-5xl px-6 py-14">
          <TrustPanel />
        </section>

        <section className="container mx-auto max-w-4xl px-6 pb-20 text-center">
          <h2 className="text-3xl font-bold md:text-5xl">
            Start documenting before
            <span className="block text-primary">
              the details disappear.
            </span>
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-muted-foreground">
            Start free. Upgrade to Proof Plus for $7.99/month when you
            need your complete record and deeper intelligence.
          </p>

          <div className="mt-8">
            <Button
              asChild
              size="lg"
            >
              <Link
                to={
                  user
                    ? "/dashboard"
                    : "/auth?mode=signup"
                }
              >
                Start Using Proof
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="container mx-auto max-w-3xl px-6 pb-12">
          <Disclaimer />
        </div>
      </main>
    </div>
  );
};

export default Pricing;