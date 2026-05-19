import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { toast } from "sonner";

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    features: ["5 incidents per month", "Basic timeline view", "Text & photo uploads (placeholder)", "Private, encrypted storage"],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$14.99",
    cadence: "/month",
    features: ["Unlimited cases & incidents", "AI structuring & summaries", "PDF evidence export", "Smart search & filters", "Follow-up reminders"],
    cta: "Start Pro trial",
    highlight: true,
  },
  {
    name: "Premium",
    price: "$39",
    cadence: "/month",
    features: ["Everything in Pro", "Contradiction engine across cases", "Collaborative case access", "Attorney / insurance sharing", "Advanced export templates"],
    cta: "Talk to us",
    highlight: false,
  },
];

const Pricing = () => (
  <div className="min-h-screen bg-subtle">
    <AppHeader />
    <main className="container py-16">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-semibold">Simple, honest pricing</h1>
        <p className="mt-4 text-muted-foreground">Start free. Upgrade when the record matters.</p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {tiers.map((t) => (
          <div key={t.name} className={`rounded-2xl border p-8 ${t.highlight ? "border-accent bg-card shadow-elevated ring-1 ring-accent/30" : "border-border bg-card shadow-card"}`}>
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
              <Link to="/auth?mode=signup" className="block mt-8"><Button className="w-full">{t.cta}</Button></Link>
            ) : (
              <Button className="w-full mt-8" variant={t.highlight ? "default" : "outline"} onClick={() => toast.message("Payments not yet enabled", { description: "Stripe / RevenueCat integration placeholder." })}>{t.cta}</Button>
            )}
          </div>
        ))}
      </div>
      <div className="mt-12 max-w-3xl mx-auto"><Disclaimer /></div>
    </main>
  </div>
);

export default Pricing;
