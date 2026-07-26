import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  plan_key: string;
  display_name: string;
  duration_label: string;
  duration_days: number;
  price_inr: number | null;
  dashakam_limit: number | null;
  includes_chant: boolean;
  includes_podcast: boolean;
  includes_learn: boolean;
  is_trial: boolean;
  is_featured: boolean;
  display_order: number;
  features: string[];
}

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    setPlans(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, refetch: fetchPlans };
}
