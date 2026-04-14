import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/services/eventLogger";
import { setSentryUser, trackSpan } from "@/monitoring/sentry";
import { queryClient } from "@/lib/queryClient";

import type { User, Session } from "@supabase/supabase-js";

interface UserProfile {
  plan: string;
  trial_expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  isAdmin: boolean;
  isFounder: boolean;
  isEmailVerified: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  trialExpiresAt: string | null;
  profile: UserProfile | null;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("plan, trial_expires_at")
      .eq("id", userId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

function clearStoredAuthTokens(storage: Storage | undefined) {
  if (!storage) return;

  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.startsWith("sb-") && key.endsWith("-auth-token")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

async function clearClientAuthState() {
  queryClient.clear();

  if (typeof window === "undefined") return;

  clearStoredAuthTokens(window.localStorage);
  clearStoredAuthTokens(window.sessionStorage);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFounder, setIsFounder] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadUserData = async (currentUser: User | null) => {
    if (currentUser) {
      const [roles, prof] = await Promise.all([
        fetchRoles(currentUser.id),
        fetchProfile(currentUser.id),
      ]);
      setIsAdmin(roles.isAdmin);
      setIsFounder(roles.isFounder);
      setProfile(prof);
    } else {
      setIsAdmin(false);
      setIsFounder(false);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
    }
  };

  useEffect(() => {
    let isActive = true;

    const syncSession = (nextSession: Session | null) => {
      if (!isActive) return;

      const nextUser = nextSession?.user ?? null;
      setSession(nextSession);
      setUser(nextUser);
      setSentryUser(nextUser?.id ?? null, nextUser?.email ?? undefined);

      void loadUserData(nextUser).finally(() => {
        if (isActive) setLoading(false);
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession);
    });

    void supabase.auth.getSession().then(({ data: { session: nextSession } }) => {
      syncSession(nextSession);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  const isEmailVerified = !!user?.email_confirmed_at;

  const trialExpiresAt = profile?.trial_expires_at ?? null;
  const isTrialActive = profile?.plan === "trial" && trialExpiresAt
    ? new Date(trialExpiresAt).getTime() > Date.now()
    : false;
  const isTrialExpired = profile?.plan === "trial" && trialExpiresAt
    ? new Date(trialExpiresAt).getTime() <= Date.now()
    : false;

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
    try {
      logEvent("user_logout");
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsFounder(false);
      setProfile(null);
      setLoading(false);
      setSentryUser(null);

      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.error("Sign-out error:", e);
    } finally {
      await clearClientAuthState();
      window.location.replace("/auth");
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, displayName, isAdmin, isFounder,
      isEmailVerified, isTrialActive, isTrialExpired, trialExpiresAt, profile,
      signUp, signIn, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
