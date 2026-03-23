import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Subscription {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  started_at: string;
  expires_at: string;
  notes?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUsedTrial, setHasUsedTrial] = useState(false);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const sub = data?.[0] ?? null;
      setSubscription(sub);

      // Check if user ever had a trial
      const { data: trialData } = await supabase.rpc("has_used_trial", { _user_id: user.id });
      setHasUsedTrial(!!trialData);
    } catch {
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const daysRemaining = subscription?.expires_at
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : 0;

  const isTrialActive = subscription?.status === "trial" && daysRemaining > 0;
  const isTrialExpired = subscription?.status === "trial" && daysRemaining <= 0;
  const isActive = subscription?.status === "active" && daysRemaining > 0;
  const isExpired = (subscription?.status === "active" || subscription?.status === "expired") && daysRemaining <= 0;
  const isPaused = subscription?.status === "paused";

  return {
    subscription,
    loading,
    daysRemaining,
    isTrialActive,
    isTrialExpired,
    isActive,
    isExpired,
    isPaused,
    hasUsedTrial,
    refetch: fetchSubscription,
  };
}
