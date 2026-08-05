import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";
import { hasBillingAccess, type BillingSubscription } from "@/lib/billing";

type Ctx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscription: BillingSubscription | null;
  subscriptionLoading: boolean;
  hasPaidAccess: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  session: null,
  loading: true,
  subscription: null,
  subscriptionLoading: true,
  hasPaidAccess: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const loadSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        return;
      } catch (error) {
        if (isJsonParseResponseError(error)) {
          try {
            const { data: refreshed } = await supabase.auth.refreshSession();
            setSession(refreshed.session);
            setUser(refreshed.session?.user ?? null);
            return;
          } catch {
            // Fall through to clean unauthenticated state.
          }
        }

        console.warn("Failed to initialize auth session", error);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void loadSession();
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      setSubscriptionLoading(false);
      return;
    }

    let cancelled = false;
    setSubscriptionLoading(true);

    supabase
      .from("subscriptions")
      .select("plan,status,current_period_end,provider")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Failed to load subscription status", error);
          setSubscription(null);
          setSubscriptionLoading(false);
          return;
        }

        setSubscription((data as BillingSubscription | null) ?? null);
        setSubscriptionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthCtx.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        subscriptionLoading,
        hasPaidAccess: hasBillingAccess(subscription),
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
