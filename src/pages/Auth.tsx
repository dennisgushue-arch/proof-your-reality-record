import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";

type AuthMode = "signin" | "signup" | "forgot" | "reset-password";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(72);

const schema = emailSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: passwordSchema,
}).refine((value) => value.password === value.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const getAuthModeFromParam = (value: string | null): AuthMode => {
  if (value === "signup" || value === "forgot" || value === "reset-password") return value;
  return "signin";
};

const isRecoveryUrl = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return window.location.search.includes("type=recovery")
    || window.location.hash.includes("type=recovery")
    || hashParams.get("type") === "recovery"
    || hashParams.has("access_token")
    || hashParams.has("refresh_token");
};

const wait = (ms: number) => new Promise<void>((resolve) => {
  globalThis.setTimeout(resolve, ms);
});

const withJsonParseRetry = async <T,>(fn: () => Promise<T>, attempts = 2): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isJsonParseResponseError(error) || attempt >= attempts) {
        throw error;
      }

      await wait(150 * attempt);
    }
  }

  throw lastError;
};

const getAuthErrorMessage = (error: unknown, fallback: string) => {
  if (isJsonParseResponseError(error)) {
    return "Authentication response was incomplete. Please try again.";
  }

  const normalizeMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed) return fallback;

    if (
      trimmed === "{}"
      || trimmed.toLowerCase() === "[object object]"
      || /^\{\s*\}$/.test(trimmed)
    ) {
      return "Authentication failed due to an incomplete server response. Please try again.";
    }

    if (/failed to execute.*json|unexpected end of json input|unexpected end of input/i.test(trimmed)) {
      return "Authentication response was incomplete. Please try again.";
    }

    return trimmed;
  };

  if (error instanceof Error) {
    return normalizeMessage(error.message);
  }

  if (typeof error === "string") {
    return normalizeMessage(error);
  }

  if (typeof error === "object" && error !== null) {
    const candidateMessage = (error as Record<string, unknown>).message;
    if (typeof candidateMessage === "string") {
      return normalizeMessage(candidateMessage);
    }
  }

  return fallback;
};
const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(getAuthModeFromParam(params.get("mode")));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [recoveryInvalid, setRecoveryInvalid] = useState(false);
  const recoveryConfirmedRef = useRef(false);
  const { user, session, loading: authLoading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user && mode !== "reset-password") nav("/dashboard", { replace: true });
  }, [user, mode, nav]);

  useEffect(() => {
    setMode(getAuthModeFromParam(params.get("mode")));
  }, [params]);

  useEffect(() => {
    if (mode !== "reset-password") {
      setRecoveryLoading(false);
      setRecoveryInvalid(false);
      recoveryConfirmedRef.current = false;
      return;
    }

    let cancelled = false;
    const cameFromRecoveryLink = isRecoveryUrl();
    setRecoveryLoading(cameFromRecoveryLink || authLoading);
    setRecoveryInvalid(false);

    const cleanRecoveryUrl = () => {
      if (window.location.search !== "?mode=reset-password" || window.location.hash) {
        nav("/auth?mode=reset-password", { replace: true });
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryConfirmedRef.current = true;
        cleanRecoveryUrl();
        setRecoveryLoading(false);
        setRecoveryInvalid(false);
        return;
      }

      if (nextSession && mode === "reset-password") {
        recoveryConfirmedRef.current = true;
        cleanRecoveryUrl();
        setRecoveryLoading(false);
        setRecoveryInvalid(false);
      }
    });

    const verifyRecoverySession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session || session || recoveryConfirmedRef.current) {
          cleanRecoveryUrl();
          setRecoveryInvalid(false);
        } else if (!authLoading && !recoveryConfirmedRef.current) {
          setRecoveryInvalid(true);
        }
      } catch {
        if (!cancelled) setRecoveryInvalid(true);
      } finally {
        if (!cancelled) setRecoveryLoading(false);
      }
    };

    void verifyRecoverySession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [authLoading, mode, nav, params, session]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setConfirmPassword("");
    setRecoveryInvalid(false);
    setRecoveryLoading(false);
    recoveryConfirmedRef.current = false;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      const parsed = emailSchema.safeParse({ email });
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
      setLoading(true);
      try {
        const { error } = await withJsonParseRetry(() => supabase.auth.resetPasswordForEmail(parsed.data.email, {
          redirectTo: `${window.location.origin}/auth?mode=reset-password`,
        }));
        if (error) throw error;
        toast.success("If an account exists for that email, a password reset link has been sent.");
        switchMode("signin");
      } catch (e: unknown) {
        toast.error(getAuthErrorMessage(e, "Could not send password reset email"));
      } finally { setLoading(false); }
      return;
    }

    if (mode === "reset-password") {
      const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
      if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
      setLoading(true);
      try {
        const { error } = await withJsonParseRetry(() => supabase.auth.updateUser({
          password: parsed.data.password,
        }));
        if (error) throw error;
        toast.success("Password updated", {
          description: "You can continue to your dashboard.",
        });
        const { data } = await supabase.auth.getSession();
        nav(data.session || session || user ? "/dashboard" : "/auth", { replace: true });
      } catch (e: unknown) {
        toast.error(getAuthErrorMessage(e, "Could not update password"));
      } finally { setLoading(false); }
      return;
    }

    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await withJsonParseRetry(() => supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        }));
        if (error) throw error;
        toast.success("Account created. Welcome to Proof.");
      } else {
        const { error } = await withJsonParseRetry(() => supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        }));
        if (error) throw error;
      }
      nav("/dashboard", { replace: true });
    } catch (e: unknown) {
      if (isJsonParseResponseError(e)) {
        if (mode === "signup") {
          try {
            const { error: signInError } = await withJsonParseRetry(() => supabase.auth.signInWithPassword({
              email: parsed.data.email,
              password: parsed.data.password,
            }));

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

        toast.error("Authentication response was incomplete", {
          description: "Please try again. If this continues, check Supabase Auth logs.",
        });
        return;
      }

      toast.error(getAuthErrorMessage(e, "Something went wrong"));
    } finally { setLoading(false); }
  };

  const title = mode === "signup"
    ? "Create your account"
    : mode === "forgot"
      ? "Reset your password"
      : mode === "reset-password"
        ? "Choose a new password"
        : "Welcome back";

  const subtitle = mode === "signup"
    ? "Start your private evidence timeline."
    : mode === "forgot"
      ? "Enter your email and we’ll send a secure reset link."
      : mode === "reset-password"
        ? "Enter a new password for your Proof account."
        : "Sign in to continue documenting.";

  const submitLabel = loading
    ? "Please wait…"
    : mode === "signup"
      ? "Create account"
      : mode === "forgot"
        ? "Send reset link"
        : mode === "reset-password"
          ? "Update password"
          : "Sign in";

  const disableSubmit = loading || recoveryLoading || (mode === "reset-password" && recoveryInvalid);
  const sessionExpired = params.get("reason") === "session-expired" && mode === "signin";

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
          <h1 className="text-2xl sm:text-3xl font-semibold text-balance">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {subtitle}
          </p>
          {sessionExpired && (
            <div className="mt-5 rounded-lg border border-amber-300/25 bg-amber-300/10 px-4 py-3" role="alert">
              <p className="text-sm font-semibold text-amber-100">Your session expired</p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">Sign in again to continue. Your cases, incidents, and evidence remain safely stored.</p>
            </div>
          )}
          {mode === "reset-password" && recoveryLoading && (
            <div className="mt-5 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground" role="status" aria-live="polite">
              Preparing your secure reset form…
            </div>
          )}
          {mode === "reset-password" && recoveryInvalid && (
            <div className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3" role="alert">
              <p className="text-sm font-medium text-destructive">This reset link is invalid or has expired.</p>
              <p className="mt-1 text-xs text-muted-foreground">Request a new password reset email to continue.</p>
              <Button type="button" variant="outline" className="mt-3 h-9" onClick={() => switchMode("forgot")}>
                Request another reset link
              </Button>
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode !== "reset-password" && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5" />
              </div>
            )}
            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">{mode === "reset-password" ? "New password" : "Password"}</Label>
                <Input id="password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" />
              </div>
            )}
            {mode === "reset-password" && (
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="mt-1.5" />
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={disableSubmit}>
              {submitLabel}
            </Button>
          </form>
          {mode === "signin" && (
            <div className="mt-4 text-center">
              <button type="button" className="text-sm text-accent font-medium underline-offset-2 hover:underline" onClick={() => switchMode("forgot")}>
                Forgot password?
              </button>
            </div>
          )}
          <p className="mt-6 text-sm text-center text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : mode === "signin" ? "New here? " : "Remembered your password? "}
            <button type="button" className="text-accent font-medium underline-offset-2 hover:underline" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}>
              {mode === "signup" ? "Sign in" : mode === "signin" ? "Create account" : "Back to sign in"}
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
