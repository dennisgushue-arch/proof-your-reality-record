import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import type { Provider } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

type SocialProvider = "google" | "facebook" | "apple";

const isFlagEnabled = (value: string | undefined, defaultValue = false) => {
  if (value === undefined || value === "") return defaultValue;
  return value.toLowerCase() === "true";
};

const socialProviders: Array<{ provider: SocialProvider; label: string; enabled: boolean }> = [
  {
    provider: "google",
    label: "Google",
    enabled: isFlagEnabled(import.meta.env.VITE_AUTH_GOOGLE_ENABLED, true),
  },
  {
    provider: "facebook",
    label: "Facebook",
    enabled: isFlagEnabled(import.meta.env.VITE_AUTH_FACEBOOK_ENABLED),
  },
  {
    provider: "apple",
    label: "Apple",
    enabled: isFlagEnabled(import.meta.env.VITE_AUTH_APPLE_ENABLED),
  },
];

const isNonProduction = import.meta.env.MODE !== "production";
const DEBUG_COPY_BUTTON_LABEL = "Copy debug URL";
const DEBUG_COPY_SUCCESS_LABEL = "Copied!";
const DEBUG_COPY_SUCCESS_TOAST = "Debug auth URL copied";
const DEBUG_COPY_RESET_MS = 1500;

const isJsonParseResponseError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to execute 'json' on 'response'|unexpected end of json input/i.test(message);
};

const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [debugUrlCopied, setDebugUrlCopied] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const copyResetTimeoutRef = useRef<number | null>(null);
  const enabledSocialProviders = socialProviders.filter(({ enabled }) => enabled);
  const showAuthDebugPanel = isNonProduction && params.get("debugAuth") === "1";
  const debugAuthParams = new URLSearchParams(location.search);
  debugAuthParams.set("debugAuth", "1");
  const debugAuthPath = `${location.pathname}?${debugAuthParams.toString()}`;
  const debugAuthAbsoluteUrl = `${window.location.origin}${debugAuthPath}`;

  useEffect(() => { if (user) nav("/dashboard", { replace: true }); }, [user, nav]);

  useEffect(() => () => {
    if (copyResetTimeoutRef.current !== null) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to Proof.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
        if (error) throw error;
      }
      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      if (mode === "signup" && isJsonParseResponseError(e)) {
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });

          if (!signInError) {
            toast.success("Account created. Welcome to Proof.");
            nav("/dashboard", { replace: true });
            return;
          }
        } catch {
          // Fall through to friendly error below.
        }

        toast.error("Signup response was incomplete", {
          description: "Please try again. If this continues, check Supabase Auth logs for /auth/v1/signup.",
        });
        return;
      }

      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const signInWithProvider = async (provider: SocialProvider) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as Provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Unable to start social sign-in");
      setLoading(false);
    }
  };

  const copyDebugUrl = async () => {
    try {
      await navigator.clipboard.writeText(debugAuthAbsoluteUrl);
      setDebugUrlCopied(true);
      if (copyResetTimeoutRef.current !== null) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
      copyResetTimeoutRef.current = window.setTimeout(() => {
        setDebugUrlCopied(false);
        copyResetTimeoutRef.current = null;
      }, DEBUG_COPY_RESET_MS);
      toast.success(DEBUG_COPY_SUCCESS_TOAST);
    } catch {
      toast.error("Unable to copy URL from this browser context");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-subtle">
      <header className="container py-4 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2">
          <div
            className="h-8 w-8 rounded-md flex items-center justify-center"
            style={{ background: "hsl(219 100% 65% / 0.12)" }}
          >
            <Shield className="h-4 w-4 text-accent" />
          </div>
          <span className="font-semibold text-lg">Proof</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center py-6 sm:py-10 px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-elevated">
          <h1 className="text-2xl sm:text-3xl font-semibold text-balance">{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup" ? "Start your private evidence timeline." : "Sign in to continue documenting."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 inline-flex items-center justify-center px-3 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="password"
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
          {enabledSocialProviders.length > 0 && (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or continue with</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {enabledSocialProviders.map(({ provider, label }) => (
                  <Button
                    key={provider}
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    disabled={loading}
                    onClick={() => signInWithProvider(provider)}
                  >
                    Continue with {label}
                  </Button>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 text-xs text-muted-foreground leading-5">
            Looking for company single sign-on (SSO)? Contact support for SAML/OIDC setup guidance.
          </p>
          {showAuthDebugPanel && (
            <div className="mt-4 rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
              <p className="font-medium text-foreground">Auth Providers Debug (non-production)</p>
              <p className="mt-1 text-muted-foreground">Mode: {import.meta.env.MODE}</p>
              <div className="mt-2 rounded border border-border bg-background/70 p-2">
                <p className="text-muted-foreground">Shareable URL:</p>
                <p className="mt-1 break-all font-mono text-[11px] text-foreground">{debugAuthAbsoluteUrl}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={copyDebugUrl}>
                    {debugUrlCopied ? DEBUG_COPY_SUCCESS_LABEL : DEBUG_COPY_BUTTON_LABEL}
                  </Button>
                  <a href={debugAuthPath} className="inline-flex h-7 items-center rounded-md border border-input px-2 text-[11px] text-foreground hover:bg-accent hover:text-accent-foreground">
                    Open debug route
                  </a>
                </div>
              </div>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {socialProviders.map(({ provider, label, enabled }) => (
                  <li key={provider}>
                    {label}: <span className={enabled ? "text-foreground" : "text-muted-foreground"}>{enabled ? "enabled" : "disabled"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button type="button" className="text-accent font-medium underline-offset-2 hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "Sign in" : "Create account"}
            </button>
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs text-muted-foreground leading-5">
            <a href="/legal/privacy-policy.html" className="legal-link px-2 py-0.5">Privacy</a>
            <a href="/legal/terms-of-service.html" className="legal-link px-2 py-0.5">Terms</a>
            <a href="/legal/data-deletion.html" className="legal-link px-2 py-0.5">Data Deletion</a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
