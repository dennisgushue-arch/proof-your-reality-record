import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AIAnalysisSchema } from "@/lib/aiAnalysis";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";
import {
  clearDictationHintTonePreference,
  DICTATION_HINT_COPY,
  getDictationHintTone,
  setDictationHintTonePreference,
  type DictationHintTone,
} from "@/lib/dictationHintCopy";
import { toast } from "sonner";

type SubscriptionRow = {
  plan: "free" | "pro" | "premium";
  status: string;
  current_period_end: string | null;
};

const Account = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [aiSmokeLoading, setAiSmokeLoading] = useState(false);
  const [aiSmokeResult, setAiSmokeResult] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [dictationTone, setDictationTone] = useState<DictationHintTone>(() => getDictationHintTone());

  useEffect(() => {
    if (!user) return;

    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));

    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setSubscription((data as SubscriptionRow | null) ?? null));
  }, [user]);

  useEffect(() => {
    const syncTone = () => setDictationTone(getDictationHintTone());
    globalThis.addEventListener("storage", syncTone);

    return () => {
      globalThis.removeEventListener("storage", syncTone);
    };
  }, []);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user!.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-billing-portal-session");

      if (error || !data?.url) {
        toast.error("Could not open billing portal", { description: error?.message ?? "No Stripe customer found yet." });
        return;
      }

      globalThis.location.href = data.url as string;
    } catch (err) {
      toast.error("Could not open billing portal", {
        description: isJsonParseResponseError(err)
          ? "Temporary session/network response issue. Please try again."
          : err instanceof Error
            ? err.message
            : "Unexpected error",
      });
    } finally {
      setPortalLoading(false);
    }
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

  const setTone = (tone: DictationHintTone) => {
    setDictationTone(tone);
    setDictationHintTonePreference(tone);
    toast.success(`Dictation hints set to ${tone}.`);
  };

  const resetTone = () => {
    clearDictationHintTonePreference();
    const nextTone = getDictationHintTone();
    setDictationTone(nextTone);
    toast.success("Dictation hints reset to the app default.");
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
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-accent/70 shrink-0" />
                <h2 className="text-lg font-semibold leading-none">Dictation hint tone</h2>
                <span aria-label="Dictation hint tone" title="Dictation hint tone" className="inline-flex">
                  <Settings2 className="h-2.5 w-2.5 text-muted-foreground/50" />
                </span>
              </div>
              <p className="text-sm text-muted-foreground max-w-md">
                Choose how the small microphone hints read throughout the app.
              </p>
            </div>
            <div className="hidden sm:flex items-center rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Microcopy
            </div>
          </div>
          <div className="h-px bg-border/70" />
          <ToggleGroup
            type="single"
            value={dictationTone}
            onValueChange={(value) => {
              if (value === "formal" || value === "warmer") setTone(value);
            }}
            variant="outline"
            size="sm"
            aria-label="Dictation hint tone"
            className="justify-start"
          >
            <ToggleGroupItem value="formal">Formal</ToggleGroupItem>
            <ToggleGroupItem value="warmer">Warmer</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={resetTone}>
              Use app default
            </Button>
          </div>
          <p className="text-xs text-muted-foreground rounded-md border border-border px-3 py-2 bg-muted/30">
            Preview: “{DICTATION_HINT_COPY[dictationTone].incident}”
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold leading-none">Billing</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                New paid signups include a 7-day trial. Early users may also have launch discount pricing applied at checkout.
              </p>
            </div>
            <span className="hidden sm:inline-flex rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Subscription
            </span>
          </div>
          <div className="h-px bg-border/70" />
          <p className="text-sm text-muted-foreground">
            Plan: <span className="text-foreground font-medium uppercase">{subscription?.plan ?? "free"}</span>
            {subscription?.status ? ` · Status: ${subscription.status}` : ""}
          </p>
          {renewalDate && (
            <p className="text-sm text-muted-foreground">Current period ends: {renewalDate}</p>
          )}
          <Button onClick={openPortal} disabled={portalLoading} variant="outline" className="w-full sm:w-auto h-11">
            {portalLoading ? "Opening…" : "Manage subscription"}
          </Button>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold leading-none">Privacy</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Your data is private and scoped to your account. Only you can access it from within your account.
              </p>
            </div>
            <span className="hidden sm:inline-flex rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Secure
            </span>
          </div>
          <div className="h-px bg-border/70" />
          <p className="text-sm text-muted-foreground">
            Account-scoped access, private storage, and controlled sharing keep your data constrained to your session and account.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-3">
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold leading-none">AI function smoke test</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Runs an authenticated call to <span className="font-mono text-foreground">analyze-incident</span> using your current session.
            </p>
          </div>
          <div className="h-px bg-border/70" />
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
