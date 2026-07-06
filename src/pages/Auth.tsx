import { useEffect, useState } from "react";
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

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

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

  if (error instanceof Error) {
    const message = error.message.trim();
    if (!message) return fallback;

    if (/failed to execute.*json|unexpected end of json input|unexpected end of input/i.test(message)) {
      return "Authentication response was incomplete. Please try again.";
    }

    return message;
  }

  return fallback;
};
const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => { if (user) nav("/dashboard", { replace: true }); }, [user, nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1.5" />
            </div>
            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>
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
