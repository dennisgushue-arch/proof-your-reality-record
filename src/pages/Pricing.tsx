import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { AppHeader } from "../components/AppHeader.tsx";
import { Disclaimer } from "../components/Disclaimer.tsx";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { BILLING_OFFERS, describeBillingAccess, getBillingOffer } from "../lib/billing.ts";

const freePlanFeatures = [
  "1 incident per month",
  "Basic timeline view",
  "Text & photo uploads",
  "Private, encrypted storage",
];

const premiumOffers = BILLING_OFFERS.filter((offer) => offer.billingMode === "subscription");

const Pricing = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast.success("Purchase complete", { description: "Your access is being updated. Refresh the account page if it does not appear immediately." });
    }

    if (checkout === "canceled") {
      toast.message("Checkout canceled", { description: "No changes were made to your subscription." });
    }

    setSearchParams((prev) => {
      prev.delete("checkout");
      return prev;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const startCheckout = async (offerId: string) => {
    const offer = getBillingOffer(offerId);
    if (!offer) {
      toast.error("Could not start checkout", { description: "That billing option is unavailable." });
      return;
    }

    try {
      setLoadingOfferId(offerId);
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { offerId },
      });

      if (error) {
        const message = error.message ?? "";
        if (/missing authorization|unauthorized|jwt|sign in|signin/i.test(message)) {
          toast.message("Sign in required", { description: "Create an account or sign in to start checkout." });
          navigate("/auth?mode=signup");
          return;
        }

        toast.error("Could not start checkout", {
          description: message || "Please verify Stripe env vars and try again.",
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
        <p className="mt-4 text-center text-xs text-muted-foreground">Private by default. No public sharing, and no hidden fees.</p>
        <p className="mt-2 text-center text-xs text-muted-foreground">Early user discount applies to accounts created during the first 3 months after launch.</p>
        <div className="mt-10 sm:mt-12 grid gap-5 sm:gap-6 md:grid-cols-3 max-w-6xl mx-auto items-stretch">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-card h-full flex flex-col">
            <h2 className="text-xl font-semibold">Free</h2>
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
                    <div className="text-3xl font-semibold leading-none">{offer.priceText}</div>
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
                  disabled={loading || loadingOfferId !== null}
                >
                  {loading ? "Checking session…" : loadingOfferId === offer.id ? "Redirecting…" : offer.cta}
                </Button>
              </div>
            );
          })}

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
