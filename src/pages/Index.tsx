import { Link } from "react-router-dom";
import { ArrowRight, Camera, FileText, Sparkles, ShieldCheck, Lock, Clock, Users, Home, Hammer, Briefcase, Building, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";

const useCases = [
  { icon: Users, title: "Co-parenting", body: "Document exchanges, missed pickups, and broken agreements." },
  { icon: Home, title: "Tenant disputes", body: "Track repair requests, habitability issues, and landlord contact." },
  { icon: Hammer, title: "Contractor work", body: "Capture promises, change orders, and incomplete work." },
  { icon: Briefcase, title: "Workplace incidents", body: "Record conduct, conversations, and patterns over time." },
  { icon: Building, title: "Small business disputes", body: "Vendor failures, customer escalations, supplier issues." },
];

const Index = () => (
  <div className="min-h-screen bg-background">
    <AppHeader />

    {/* Hero */}
    <section className="relative overflow-hidden bg-hero text-navy-foreground">
      <div className="container py-24 md:py-32 max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80 mb-6">
          <Lock className="h-3 w-3" /> Private, encrypted, owned by you
        </div>
        <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] tracking-tight text-white">
          Lock the facts before<br />memory changes.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-white/75 max-w-2xl">
          Proof turns messy real-life conflicts into clean, timestamped evidence timelines.
          Your black box recorder for real life.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-white text-navy hover:bg-white/90">
              Start documenting <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to="/example">
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              See example packet
            </Button>
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Row-level encrypted records</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> Tamper-evident timestamps</div>
          <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Court-ready exports</div>
        </div>
      </div>
    </section>

    {/* Use cases */}
    <section className="container py-20 md:py-28">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-accent uppercase tracking-wider">Who it's for</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-semibold">Built for the moments you wish you'd written down.</h2>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map((u) => (
          <div key={u.title} className="rounded-xl border border-border bg-card p-6 shadow-card">
            <u.icon className="h-6 w-6 text-accent" />
            <h3 className="mt-4 text-lg font-semibold">{u.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{u.body}</p>
          </div>
        ))}
      </div>
    </section>

    {/* How it works */}
    <section className="bg-subtle border-y border-border">
      <div className="container py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-accent uppercase tracking-wider">How it works</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold">Capture. Structure. Export.</h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            { icon: Camera, n: "01", t: "Capture", d: "Dump what happened in plain words, the moment it happens. Attach photos, screenshots, voice notes." },
            { icon: Sparkles, n: "02", t: "Structure", d: "AI turns your raw narrative into a neutral summary, timeline, key claims, and missing-evidence checklist." },
            { icon: FileText, n: "03", t: "Export", d: "When you need it, generate a clean, chronological evidence packet ready to share with a lawyer or mediator." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-xl bg-card border border-border p-7 shadow-card">
              <div className="text-xs font-mono text-muted-foreground">{s.n}</div>
              <s.icon className="h-7 w-7 text-accent mt-3" />
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Feature highlights */}
    <section className="container py-20 md:py-28">
      <div className="grid gap-12 md:grid-cols-2 items-center">
        <div>
          <p className="text-sm font-medium text-accent uppercase tracking-wider">Why Proof</p>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold">Never argue about what actually happened again.</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Memory fades and stories shift. Proof gives you a single, organized record of what happened, when, and who was involved — so the facts are already there when you need them.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            "Neutral, emotion-free summaries of every incident",
            "Chronological timeline you can search and filter",
            "Contradiction detection across past incidents",
            "Missing evidence suggestions before it's too late",
            "Clean PDF evidence packets in one click",
          ].map((f) => (
            <li key={f} className="flex gap-3 rounded-lg border border-border bg-card p-4">
              <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <span className="text-sm">{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>

    {/* Pricing teaser */}
    <section className="bg-navy text-navy-foreground">
      <div className="container py-20 text-center max-w-2xl">
        <h2 className="text-3xl md:text-4xl font-semibold text-white">Start free. Upgrade when it matters.</h2>
        <p className="mt-4 text-white/70">Free for the first five incidents a month. Pro unlocks AI analysis, PDF export, and unlimited cases.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/pricing"><Button size="lg" className="bg-white text-navy hover:bg-white/90">See pricing</Button></Link>
          <Link to="/auth?mode=signup"><Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">Create free account</Button></Link>
        </div>
      </div>
    </section>

    <footer className="container py-10">
      <Disclaimer />
      <p className="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Proof. All rights reserved.</p>
    </footer>
  </div>
);

export default Index;
