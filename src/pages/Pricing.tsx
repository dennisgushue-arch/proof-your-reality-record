import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";

type Tier = {
  name: "Free" | "Pro" | "Premium";
  price: string;
  cadence: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

const tiers: Tier[] = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    features: ["1 incident per month", "Basic timeline view", "Text & photo uploads", "Private, encrypted storage"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$14.99",
    cadence: "/month",
    features: ["Unlimited cases & incidents", "AI structuring & summaries", "PDF evidence export", "Smart search & filters", "Follow-up reminders", "7-day free trial for new users"],
    cta: "Start 7-day trial",
    highlight: true,
  },
  {
    name: "Premium",
    price: "$39",
    cadence: "/month",
    features: ["Everything in Pro", "Contradiction engine across cases", "Collaborative case access", "Advanced export templates", "7-day free trial for new users"],
    cta: "Start 7-day trial",
    highlight: false,
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "premium" | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast.success("Subscription started", { description: "Your 7-day trial or discounted plan is now active." });
    }

    if (checkout === "canceled") {
      toast.message("Checkout canceled", { description: "No changes were made to your subscription." });
    }

    setSearchParams((prev) => {
      prev.delete("checkout");
      return prev;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  const startCheckout = async (plan: "pro" | "premium") => {
    let activeUser = user;

    if (!activeUser) {
      try {
        activeUser = (await supabase.auth.getSession()).data.session?.user ?? null;
      } catch (error) {
        if (!isJsonParseResponseError(error)) {
          toast.error("Could not start checkout", {
            description: error instanceof Error ? error.message : "Unexpected session error.",
          });
          return;
        }
      }
    }

    if (!activeUser) {
      try {
        activeUser = (await supabase.auth.refreshSession()).data.session?.user ?? null;
      } catch {
        // Continue to unauthenticated guard below.
      }
    }

    if (!activeUser) {
      toast.message("Sign in required", { description: "Create an account or sign in to start checkout." });
      navigate("/auth?mode=signup");
      return;
    }

    try {
      setLoadingPlan(plan);
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { plan },
      });

      if (error || !data?.url) {
        toast.error("Could not start checkout", {
          description: error?.message ?? "Please verify Stripe env vars and try again.",
        });
        return;
      }

      globalThis.location.href = data.url as string;
    } catch (err) {
      toast.error("Could not start checkout", {
        description: isJsonParseResponseError(err)
          ? "Temporary session/network response issue. Please try again."
          : err instanceof Error
            ? err.message
            : "Unexpected network error.",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-12 sm:py-16">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-balance">Private, straightforward pricing</h1>
          <p className="mt-4 text-muted-foreground">Start free, then choose the plan that fits your case load. New users get a 7-day trial, and early users receive 50% off. Your records stay encrypted and account-scoped.</p>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Private by default. No public sharing, and no hidden fees.</p>
        <p className="mt-4 text-center text-xs text-muted-foreground">Early user discount applies to accounts created during the first 3 months after launch.</p>
        <div className="mt-10 sm:mt-12 grid gap-5 sm:gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl border p-5 sm:p-8 ${t.highlight ? "border-accent bg-card shadow-elevated ring-1 ring-accent/30" : "border-border bg-card shadow-card"}`}>
              {t.highlight && <div className="text-xs font-semibold uppercase tracking-wider text-accent mb-3">Most popular</div>}
              <h2 className="text-xl font-semibold">{t.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-semibold">{t.price}</span>
                <span className="text-muted-foreground text-sm">{t.cadence}</span>
              </div>
              <ul className="mt-6 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-accent shrink-0 mt-0.5" /><span>{f}</span></li>
                ))}
              </ul>
              {t.name === "Free" ? (
                <Button asChild className="w-full mt-7 sm:mt-8 h-11">
                  <Link to="/auth?mode=signup">{t.cta}</Link>
                </Button>
              ) : (
                <Button
                  className="w-full mt-7 sm:mt-8 h-11"
                  variant={t.highlight ? "default" : "outline"}
                  onClick={() => startCheckout(t.name.toLowerCase() as "pro" | "premium")}
                  disabled={loadingPlan !== null}
                >
                  {loadingPlan === t.name.toLowerCase() ? "Redirecting…" : t.cta}
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 max-w-3xl mx-auto"><Disclaimer /></div>
      </main>
    </div>
  );
};

export default Pricing;
