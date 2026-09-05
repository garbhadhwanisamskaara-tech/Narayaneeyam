import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SUBSCRIPTION_ENABLED } from "@/config/features";

interface FeaturedPlan {
  price_inr: number | null;
  duration_label: string | null;
}

export default function TrialStatusLine() {
  const { user, profile } = useAuth();
  const [plan, setPlan] = useState<FeaturedPlan | null>(null);

  useEffect(() => {
    async function fetchFeaturedPlan() {
      try {
        const { data } = await supabase
          .from("subscription_plans")
          .select("price_inr, duration_label")
          .eq("is_active", true)
          .eq("is_featured", true)
          .maybeSingle();
        if (data) setPlan(data);
      } catch {
        // silent — this is a decorative line only
      }
    }
    void fetchFeaturedPlan();
  }, []);

  const isTrialActive =
    user &&
    profile?.subscription_status === "trial" &&
    profile?.subscription_end &&
    new Date(profile.subscription_end).getTime() > Date.now();

  if (!SUBSCRIPTION_ENABLED || !isTrialActive || !plan?.price_inr) return null;

  const priceText = `₹${Number(plan.price_inr).toLocaleString("en-IN")}${
    plan.duration_label ? `/${plan.duration_label}` : ""
  }`;

  const expiryDate = new Date(profile.subscription_end!).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="w-full bg-background border-b border-border px-4 py-2 text-center">
      <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug">
        <span className="line-through">{priceText}</span>
        <span className="text-secondary-foreground">{" — you're on free trial till "}{expiryDate}</span>
      </p>
    </div>
  );
}
