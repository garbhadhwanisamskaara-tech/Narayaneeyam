import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Current subscription state comes from `profiles`
 * (subscription_plan_id / subscription_status / subscription_start / subscription_end);
 * plan metadata comes from `subscription_plans`.
 */
export interface Subscription {
  plan_id: string | null;
  /** plan_key of the linked subscription plan, when available. */
  tier: string | null;
  status: string | null;
  started_at: string | null;
  expires_at: string | null;
}

export function useSubscription() {
  const { user, profile, subscriptionPlan, loading: authLoading } = useAuth();
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  const [checkingTrial, setCheckingTrial] = useState(true);

  const fetchTrialHistory = useCallback(async () => {
    if (!user) {
      setHasUsedTrial(false);
      setCheckingTrial(false);
      return;
    }
    try {
      const { data } = await supabase.rpc("has_used_trial", { _user_id: user.id });
      setHasUsedTrial(!!data);
    } catch {
      setHasUsedTrial(false);
    } finally {
      setCheckingTrial(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrialHistory();
  }, [fetchTrialHistory]);

  const subscription: Subscription | null = profile
    ? {
        plan_id: profile.subscription_plan_id,
        tier: subscriptionPlan?.plan_key ?? null,
        status: profile.subscription_status,
        started_at: profile.subscription_start,
        expires_at: profile.subscription_end,
      }
    : null;

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  const isTrialActive = subscription?.status === "trial" && daysRemaining > 0;
  const isTrialExpired = subscription?.status === "trial" && daysRemaining <= 0;
  const isActive = subscription?.status === "subscribed" && daysRemaining > 0;
  const isExpired =
    (subscription?.status === "subscribed" || subscription?.status === "expired") && daysRemaining <= 0;
  const isPaused = false;

  return {
    subscription,
    plan: subscriptionPlan,
    loading: authLoading || checkingTrial,
    daysRemaining,
    isTrialActive,
    isTrialExpired,
    isActive,
    isExpired,
    isPaused,
    hasUsedTrial,
    refetch: fetchTrialHistory,
  };
}
