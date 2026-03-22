import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/services/eventLogger";
import { setSentryUser, trackSpan } from "@/monitoring/sentry";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  isAdmin: boolean;
  isFounder: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchRoles(userId: string): Promise<{ isAdmin: boolean; isFounder: boolean }> {
  try {
    const [{ data: adminData }, { data: founderData }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "founder" }),
    ]);
    return {
      isAdmin: !!adminData,
      isFounder: !!founderData || !!adminData,
    };
  } catch {
    return { isAdmin: false, isFounder: false };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setSentryUser(session?.user?.id ?? null, session?.user?.email ?? undefined);

      if (session?.user) {
        const roles = await fetchRoles(session.user.id);
        setIsAdmin(roles.isAdmin);
        setIsFounder(roles.isFounder);
      } else {
        setIsAdmin(false);
        setIsFounder(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const roles = await fetchRoles(session.user.id);
        setIsAdmin(roles.isAdmin);
        setIsFounder(roles.isFounder);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  const signUp = async (email: string, password: string, name: string) => {
    return trackSpan("auth.signUp", "auth", async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: name },
          emailRedirectTo: window.location.origin,
        },
      });
      if (!error) logEvent("user_signup");
      return { error: error as Error | null };
    });
  };

  const signIn = async (email: string, password: string) => {
    return trackSpan("auth.signIn", "auth", async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) logEvent("user_login");
      return { error: error as Error | null };
    });
  };

  const signOut = async () => {
    logEvent("user_logout");
    setIsAdmin(false);
    setIsFounder(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, displayName, isAdmin, isFounder, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
