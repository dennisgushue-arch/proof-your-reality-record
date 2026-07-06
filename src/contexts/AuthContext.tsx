/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";

type Ctx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({ user: null, session: null, loading: true, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signOut = async () => { await supabase.auth.signOut(); };

  return <AuthCtx.Provider value={{ user, session, loading, signOut }}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
