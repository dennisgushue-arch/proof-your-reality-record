import { useEffect, useState } from "react";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { AppHeader } from "../components/AppHeader.tsx";
import { WhatsNewCard } from "../components/WhatsNewCard.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { AIAnalysisSchema } from "../lib/aiAnalysis.ts";
import { describeBillingAccess, type BillingSubscription } from "../lib/billing.ts";
import { toast } from "sonner";

const Account = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [aiSmokeLoading, setAiSmokeLoading] = useState(false);
  const [aiSmokeResult, setAiSmokeResult] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");

  useEffect(() => {
    if (!user) return;

    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));

    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setSubscription((data as BillingSubscription | null) ?? null));
  }, [user]);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user!.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("create-billing-portal-session");
    setPortalLoading(false);

    if (error || !data?.url) {
      toast.error("Could not open billing portal", { description: error?.message ?? "No Stripe customer found yet." });
      return;
    }

    globalThis.location.assign(data.url as string);
  };

  const runAISmokeTest = async () => {
    setAiSmokeLoading(true);
    setAiSmokeResult(null);

    try {
      const payload = {
        title: "Smoke Test Incident",
        narrative:
          "On 2026-05-24 at 8:30 PM, I called support and was told a technician would arrive by 9:00 PM. At 9:20 PM they said no visit was scheduled.",
        occurred_at: new Date().toISOString(),
        location: "Phone support",
        people: ["Support Agent"],
      };

      const { data, error } = await supabase.functions.invoke("analyze-incident", {
        body: payload,
      });

      if (error) {
        setAiSmokeResult(`Function call failed: ${error.message}`);
        toast.error("Analyze smoke test failed", { description: error.message });
        return;
      }

      const parsed = AIAnalysisSchema.safeParse(data?.analysis);
      if (!parsed.success) {
        setAiSmokeResult("Function responded, but payload shape was invalid.");
        toast.error("Analyze smoke test failed", {
          description: "Response shape did not match AIAnalysis schema.",
        });
        return;
      }

      setAiSmokeResult(
        `Success: ${parsed.data.evidence_quality_score}/100 · ${parsed.data.contradictions.length} contradiction(s) · ${parsed.data.missing_evidence.length} missing evidence item(s).`,
      );
      toast.success("Analyze smoke test succeeded", {
        description: "Authenticated invocation path is working.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setAiSmokeResult(`Unexpected error: ${message}`);
      toast.error("Analyze smoke test failed", { description: message });
    } finally {
      setAiSmokeLoading(false);
    }
  };

  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : null;

  const sendFeedback = () => {
    const subject = encodeURIComponent("Proof app feedback");
    const body = encodeURIComponent(
      feedbackNote.trim() || "Hi Proof team,\n\nHere is my feedback:\n\n",
    );
    globalThis.location.assign(`mailto:proofrealityrecord@yahoo.com?subject=${subject}&body=${body}`);
    toast.success("Opening your email client for feedback");
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-8 sm:py-10 max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-balance">Account</h1>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={loading} className="w-full sm:w-auto h-11">{loading ? "Saving…" : "Save changes"}</Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <h2 className="text-lg font-semibold">Billing</h2>
          <p className="text-xs text-muted-foreground">Premium signups include a 7-day trial. Early users may also have launch discount pricing applied at checkout.</p>
          <p className="text-sm text-muted-foreground">
            Plan: <span className="text-foreground font-medium uppercase">{subscription?.plan ?? "free"}</span>
            {subscription?.status ? ` · Status: ${subscription.status}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">Access: {describeBillingAccess(subscription)}</p>
          {renewalDate && (
            <p className="text-sm text-muted-foreground">Current period ends: {renewalDate}</p>
          )}
          <Button onClick={openPortal} disabled={portalLoading} variant="outline" className="w-full sm:w-auto h-11">
            {portalLoading ? "Opening…" : "Manage subscription"}
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card text-sm text-muted-foreground">
          Your data is private and scoped to your account. Only you can access it from within your account.
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <h2 className="text-lg font-semibold">Security & Privacy reassurance</h2>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <li>• Account data is scoped per user and protected by authenticated access rules.</li>
            <li>• Incident records preserve timestamp context to support trustworthy chronology.</li>
            <li>• You can review privacy and deletion policies any time in the support links below.</li>
          </ul>
        </div>

        <div className="mt-6">
          <WhatsNewCard />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="text-lg font-semibold">Help & Support</h2>
          <p className="text-sm text-muted-foreground">
            Find quick answers, review privacy details, or send feedback directly to help prioritize product updates.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/privacy-policy.html">Privacy policy</a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/data-deletion.html">Data deletion guide</a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/terms-of-service.html">Terms & troubleshooting</a>
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-note">Feedback note (optional)</Label>
            <Textarea
              id="feedback-note"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              rows={4}
              placeholder="Tell us what worked, what confused you, or what feature you want next."
            />
          </div>
          <Button onClick={sendFeedback} className="w-full sm:w-auto h-11">Send feedback</Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <h2 className="text-lg font-semibold">AI function smoke test</h2>
          <p className="text-sm text-muted-foreground">
            Runs an authenticated call to <span className="font-mono text-foreground">analyze-incident</span> using your current session.
          </p>
          <Button onClick={runAISmokeTest} disabled={aiSmokeLoading} variant="outline" className="w-full sm:w-auto h-11">
            {aiSmokeLoading ? "Testing…" : "Run Analyze with AI smoke test"}
          </Button>
          {aiSmokeResult && (
            <p className="text-xs text-muted-foreground rounded-md border border-border px-3 py-2 bg-muted/30">
              {aiSmokeResult}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Account;
