import { Link } from "react-router-dom";
import { ArrowRight, Mic, FileText, Sparkles, ShieldCheck, Lock, Clock, Users, Home, Hammer, Briefcase, Building, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";

const useCases = [
  { icon: Users, title: "Co-parenting disputes", body: "Document exchanges, missed pickups, and broken agreements with precision timestamps." },
  { icon: Home, title: "Tenant disputes", body: "Track repair requests, habitability issues, and every landlord communication." },
  { icon: Hammer, title: "Contractor work", body: "Capture promises, change orders, and incomplete work before memory fades." },
  { icon: Briefcase, title: "Workplace incidents", body: "Record conduct, conversations, and patterns over time. Structured and neutral." },
  { icon: Building, title: "Small business disputes", body: "Vendor failures, customer escalations, supplier issues — all in one place." },
];

const Index = () => (
  <div className="min-h-screen bg-background">
    <AppHeader />

    {/* Hero */}
    <section className="border-b border-border">
      <div className="container py-24 md:py-36 max-w-5xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-8">
          <Lock className="h-3 w-3 text-accent" /> Private, encrypted, owned by you
        </div>
        <h1 className="text-5xl md:text-7xl leading-[1.05]">
          Lock the facts before<br />memory changes.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl" style={{ fontWeight: 400, lineHeight: 1.6 }}>
          Proof transforms stressful real-life incidents into structured, timestamped evidence timelines.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-semibold">
              <Mic className="mr-2 h-4 w-4" /> Start Recording
            </Button>
          </Link>
          <Link to="/example">
            <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-card">
              View Sample Private Evidence Packet
            </Button>
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Row-level encrypted records</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-accent" /> Tamper-evident timestamps</div>
          <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Private export packets</div>
        </div>
      </div>
    </section>

    {/* Evidence preview strip */}
    <section className="border-b border-border bg-card/30">
      <div className="container py-12 max-w-5xl">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-xs font-mono text-muted-foreground mb-2">5:42 PM — Incident Logged</div>
            <div className="h-1.5 w-full rounded-full bg-border">
              <div className="h-1.5 rounded-full bg-accent" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-5 py-4">
            <div className="text-xs font-mono text-muted-foreground mb-2">5:45 PM — Screenshot Uploaded</div>
            <div className="h-1.5 w-full rounded-full bg-border">
              <div className="h-1.5 rounded-full bg-success" style={{ width: "100%" }} />
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card px-5 py-4 contradiction-card rounded-l-none">
            <div className="text-xs font-mono text-muted-foreground mb-2">5:47 PM — Contradiction Found</div>
            <div className="h-1.5 w-full rounded-full bg-border">
              <div className="h-1.5 rounded-full bg-destructive" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Contradiction sample */}
    <section className="container py-20 md:py-28 max-w-5xl">
      <div className="grid gap-12 md:grid-cols-2 items-start">
        <div>
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">Contradiction Detection</p>
          <h2 className="mt-3 text-3xl md:text-4xl">Catch the lies you forgot to write down.</h2>
          <p className="mt-4 text-muted-foreground" style={{ lineHeight: 1.6 }}>
            Proof cross-references everything said across every incident. When stories shift, you'll know — with exact dates and quotes.
          </p>
        </div>
        <div className="contradiction-card rounded-lg border border-border px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm font-semibold text-destructive">Possible Contradiction Detected</span>
          </div>
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-xs font-mono text-muted-foreground mb-1">April 18</div>
              <p className="text-foreground">"Cabinets already ordered."</p>
            </div>
            <div className="border-t border-border/50 pt-4">
              <div className="text-xs font-mono text-muted-foreground mb-1">May 5</div>
              <p className="text-foreground">"Supplier delays prevented ordering."</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    {/* Use cases */}
    <section className="border-y border-border bg-card/20">
      <div className="container py-20 md:py-28 max-w-5xl">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">Who it's for</p>
          <h2 className="mt-3 text-3xl md:text-4xl">Built for the moments you wish you'd written down.</h2>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((u) => (
            <div key={u.title} className="rounded-lg border border-border bg-card p-6 shadow-card">
              <u.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-4 text-base font-semibold">{u.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>{u.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* How it works */}
    <section className="container py-20 md:py-28 max-w-5xl">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest">How it works</p>
        <h2 className="mt-3 text-3xl md:text-4xl">Capture. Structure. Export.</h2>
      </div>
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { icon: Mic, n: "01", t: "Capture", d: "Speak or type what happened the moment it happens. Attach photos, screenshots, voice notes. No formatting required." },
          { icon: Sparkles, n: "02", t: "Structure", d: "AI turns your raw narrative into a neutral summary, timeline, key claims, and missing-evidence checklist." },
          { icon: FileText, n: "03", t: "Export", d: "Generate a clean, chronological evidence packet you can keep, print, or export when needed." },
        ].map((s) => (
          <div key={s.n} className="rounded-lg border border-border bg-card p-7 shadow-card">
            <div className="text-xs font-mono text-muted-foreground">{s.n}</div>
            <s.icon className="h-6 w-6 text-accent mt-4" />
            <h3 className="mt-4 text-lg">{s.t}</h3>
            <p className="mt-2 text-sm text-muted-foreground" style={{ lineHeight: 1.6 }}>{s.d}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Feature list */}
    <section className="border-t border-border bg-card/20">
      <div className="container py-20 md:py-28 max-w-5xl">
        <div className="grid gap-12 md:grid-cols-2 items-center">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-widest">Why Proof</p>
            <h2 className="mt-3 text-3xl md:text-4xl">Never argue about what actually happened again.</h2>
            <p className="mt-4 text-muted-foreground" style={{ lineHeight: 1.6 }}>
              Memory fades and stories shift. Proof gives you a single, organized record of what happened, when, and who was involved — so the facts are already there when you need them.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              "Neutral, emotion-free summaries of every incident",
              "Chronological timeline you can search and filter",
              "Contradiction detection across past incidents",
              "Missing evidence suggestions before it's too late",
              "Clean evidence packets ready to export in one click",
            ].map((f) => (
              <li key={f} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                <Check className="h-4 w-4 text-success shrink-0 mt-0.5" />
                <span className="text-sm text-foreground">{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    {/* CTA */}
    <section className="border-t border-border">
      <div className="container py-20 text-center max-w-2xl">
        <h2 className="text-3xl md:text-4xl">Personal evidence infrastructure.<br />Yours, when it matters.</h2>
        <p className="mt-4 text-muted-foreground">Free includes 1 incident per month. Pro unlocks AI analysis, PDF export, and unlimited cases.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/auth?mode=signup">
            <Button size="lg" className="bg-accent text-white hover:bg-accent/90 font-semibold">
              <Mic className="mr-2 h-4 w-4" /> Start Recording
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-card">See pricing</Button>
          </Link>
        </div>
      </div>
    </section>

    <footer className="border-t border-border container py-10">
      <Disclaimer />
      <div className="mt-5 grid w-full max-w-lg mx-auto grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-muted-foreground leading-5 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
        <a href="/legal/privacy-policy.html" className="legal-link px-2 py-0.5 text-center">Privacy Policy</a>
        <a href="/legal/terms-of-service.html" className="legal-link px-2 py-0.5 text-center">Terms of Service</a>
        <a href="/legal/cookie-notice.html" className="legal-link px-2 py-0.5 text-center">Cookie Notice</a>
        <a href="/legal/data-deletion.html" className="legal-link px-2 py-0.5 text-center">Data Deletion</a>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Proof. All rights reserved.</p>
    </footer>
  </div>
);

export default Index;
