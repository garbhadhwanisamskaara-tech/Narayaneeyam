import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logEvent } from "@/services/eventLogger";
import { setSentryUser, trackSpan } from "@/monitoring/sentry";
import { identifyUser, resetAnalytics } from "@/lib/analytics";
import { queryClient } from "@/lib/queryClient";

import type { User, Session } from "@supabase/supabase-js";

export interface SubscriptionPlanSummary {
  id: string;
  plan_key: string;
  display_name: string;
  duration_label: string | null;
  duration_days: number | null;
  price_inr: number | null;
  is_trial: boolean;
  features: string[] | null;
}

interface UserProfile {
  subscription_plan_id: string | null;
  subscription_status: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  preferred_script_language?: string | null;
  preferred_translation_language?: string | null;
}

/** Fixed trial end date for all new signups. */
const TRIAL_END_DATE = new Date("2026-12-31T23:59:59+05:30").toISOString();
/** Hardcoded grace period after trial expiry / subscription end. */
export const GRACE_PERIOD_DAYS = 7;

/**
 * Allowed values of profiles.subscription_status: trial | subscribed | expired | deleted.
 * A missing status is treated as trial (the column default).
 */
function isTrialStatus(status: string | null | undefined) {
  return !status || status === "trial";
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
  /** End date that governs access: trial expiry or subscription end. */
  accessEndsAt: string | null;
  /** True while past the end date but within the 7-day grace period. */
  isInGracePeriod: boolean;
  /** Whole days of grace left (0 when not in grace). */
  graceDaysRemaining: number;
  /** True once the end date + grace period has fully passed. */
  isAccessLocked: boolean;
  profile: UserProfile | null;
  subscriptionPlan: SubscriptionPlanSummary | null;
  signUp: (
    email: string,
    password: string,
    name: string,
    prefs?: { scriptLanguage?: string | null; translationLanguage?: string | null },
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyPhoneOtp: (phone: string, token: string, name?: string) => Promise<{ error: Error | null }>;
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
      .select(
        "subscription_plan_id, subscription_status, subscription_start, subscription_end, preferred_script_language, preferred_translation_language",
      )
      .eq("id", userId)
      .maybeSingle();
    return (data as UserProfile) ?? null;
  } catch {
    return null;
  }
}

/** Plan metadata always comes from subscription_plans, never from profiles. */
async function fetchPlan(planId: string | null | undefined): Promise<SubscriptionPlanSummary | null> {
  if (!planId) return null;
  try {
    const { data } = await supabase
      .from("subscription_plans")
      .select("id, plan_key, display_name, duration_label, duration_days, price_inr, is_trial, features")
      .eq("id", planId)
      .maybeSingle();
    return (data as SubscriptionPlanSummary) ?? null;
  } catch {
    return null;
  }
}

/** The trial plan row from subscription_plans (is_trial = true). */
async function fetchTrialPlanId(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from("subscription_plans")
      .select("id")
      .eq("is_trial", true)
      .limit(1)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * First-login initialisation: copy the language preferences chosen at sign-up
 * into the profile row, and put the user on the fixed-date free trial.
 */
async function initialiseNewProfile(user: User, prof: UserProfile | null): Promise<UserProfile | null> {
  if (!prof) return prof;

  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const patch: Record<string, string> = {};

  if (!prof.preferred_script_language && meta.preferred_script_language) {
    patch.preferred_script_language = meta.preferred_script_language;
  }
  if (!prof.preferred_translation_language && meta.preferred_translation_language) {
    patch.preferred_translation_language = meta.preferred_translation_language;
  }

  // Fixed-date free trial: fill in anything missing for a trial profile.
  const needsTrialInit =
    isTrialStatus(prof.subscription_status) &&
    (!prof.subscription_status || !prof.subscription_end || !prof.subscription_plan_id || !prof.subscription_start);

  if (needsTrialInit) {
    patch.subscription_status = "trial";
    if (!prof.subscription_start) {
      patch.subscription_start = new Date(user.created_at ?? Date.now()).toISOString();
    }
    if (!prof.subscription_end) {
      patch.subscription_end = TRIAL_END_DATE;
    }
    if (!prof.subscription_plan_id) {
      const trialPlanId = await fetchTrialPlanId();
      if (trialPlanId) patch.subscription_plan_id = trialPlanId;
    }
  }

  if (Object.keys(patch).length === 0) return prof;

  try {
    await supabase.from("profiles").update(patch).eq("id", user.id);
  } catch {
    return prof;
  }

  return { ...prof, ...patch } as UserProfile;
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
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlanSummary | null>(null);

  const loadUserData = async (currentUser: User | null) => {
    if (currentUser) {
      const [roles, prof] = await Promise.all([
        fetchRoles(currentUser.id),
        fetchProfile(currentUser.id),
      ]);
      setIsAdmin(roles.isAdmin);
      setIsFounder(roles.isFounder);
      const nextProfile = await initialiseNewProfile(currentUser, prof);
      setProfile(nextProfile);
      setSubscriptionPlan(await fetchPlan(nextProfile?.subscription_plan_id));
    } else {
      setIsAdmin(false);
      setIsFounder(false);
      setProfile(null);
      setSubscriptionPlan(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const prof = await fetchProfile(user.id);
      setProfile(prof);
      setSubscriptionPlan(await fetchPlan(prof?.subscription_plan_id));
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
      if (nextUser) identifyUser(nextUser.id, nextUser.email);


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

  const displayName =
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    user?.phone ||
    "";

  // Phone-only users have no email to verify — treat as verified.
  const isEmailVerified = !user?.email ? true : !!user?.email_confirmed_at;

  const trialExpiresAt = profile?.subscription_end ?? null;
  const onTrial = isTrialStatus(profile?.subscription_status) && !!profile;
  const isTrialActive = onTrial && trialExpiresAt
    ? new Date(trialExpiresAt).getTime() > Date.now()
    : false;
  const isTrialExpired = onTrial && trialExpiresAt
    ? new Date(trialExpiresAt).getTime() <= Date.now()
    : false;

  // Access end date: trial expiry for trial users, subscription end for paid users.
  const accessEndsAt = profile?.subscription_end ?? null;
  const accessEndsMs = accessEndsAt ? new Date(accessEndsAt).getTime() : null;
  const graceEndsMs = accessEndsMs !== null ? accessEndsMs + GRACE_PERIOD_DAYS * 86400000 : null;
  // Identical 7-day grace window for trial and subscribed users (and expired ones).
  const graceApplies =
    !!profile && accessEndsMs !== null && profile.subscription_status !== "deleted";
  const isInGracePeriod =
    graceApplies && accessEndsMs! <= Date.now() && Date.now() < graceEndsMs!;
  const graceDaysRemaining = isInGracePeriod
    ? Math.max(0, Math.ceil((graceEndsMs! - Date.now()) / 86400000))
    : 0;
  const isAccessLocked = graceApplies && Date.now() >= graceEndsMs!;




  const signUp = async (
    email: string,
    password: string,
    name: string,
    prefs?: { scriptLanguage?: string | null; translationLanguage?: string | null },
  ) => {
    return trackSpan("auth.signUp", "auth", async () => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name,
            ...(prefs?.scriptLanguage ? { preferred_script_language: prefs.scriptLanguage } : {}),
            ...(prefs?.translationLanguage
              ? { preferred_translation_language: prefs.translationLanguage }
              : {}),
          },
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

  const signInWithPhone = async (phone: string) => {
    return trackSpan("auth.signInWithPhone", "auth", async () => {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      return { error: error as Error | null };
    });
  };

  const verifyPhoneOtp = async (phone: string, token: string, name?: string) => {
    return trackSpan("auth.verifyPhoneOtp", "auth", async () => {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
      if (!error && data.user) {
        logEvent("user_login");
        // Persist display name on first verification
        if (name) {
          try {
            await supabase.auth.updateUser({ data: { display_name: name } });
            await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
          } catch { /* silent */ }
        }
      }
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
      setSubscriptionPlan(null);
      setLoading(false);
      setSentryUser(null);
      resetAnalytics();

      await supabase.auth.signOut({ scope: "local" });
    } catch (e) {
      console.error("Sign-out error:", e);
    } finally {
      await clearClientAuthState();
      window.location.replace("/");
    }
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, displayName, isAdmin, isFounder,
      isEmailVerified, isTrialActive, isTrialExpired, trialExpiresAt,
      accessEndsAt, isInGracePeriod, graceDaysRemaining, isAccessLocked,
      profile, subscriptionPlan,
      signUp, signIn, signInWithPhone, verifyPhoneOtp, signOut, refreshProfile,
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
