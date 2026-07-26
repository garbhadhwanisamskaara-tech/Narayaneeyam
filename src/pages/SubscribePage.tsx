import { motion } from "framer-motion";
import { Check, Crown, BookOpen, Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

/** Icon choice is a display concern, not stored data -- derived from the plan's flags. */
function planIcon(plan: SubscriptionPlan) {
  if (plan.is_trial) return BookOpen;
  if (plan.includes_learn) return Crown;
  return Mic;
}

export default function SubscribePage() {
  const { user } = useAuth();
  const { subscription, hasUsedTrial, isActive, isTrialActive, loading: subLoading } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { toast } = useToast();

  const handleSubscribe = (planKey: string) => {
    toast({
      title: "Coming soon",
      description: "Payment integration will be available shortly. Your interest has been noted!",
    });
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Sign in to subscribe</h2>
          <p className="text-sm text-muted-foreground font-sans mb-4">Create an account or sign in to choose a plan.</p>
          <Link
            to="/auth"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const previousTier = subscription?.tier;
  const loading = subLoading || plansLoading;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SEO
        path="/subscribe"
        title="Subscribe — Sriman Narayaneeyam"
        description="Choose a plan to unlock all 100 Dashakams of Sriman Narayaneeyam — Chant, Podcast, Script Library and more."
      />
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Continue your devotional journey with Sriman Narayaneeyam
        </p>
        {previousTier && subscription?.status !== "active" && subscription?.status !== "trial" && (
          <p className="text-sm text-secondary font-sans mt-2">
            Welcome back! Your {previousTier} subscription expired
            {subscription?.expires_at ? ` on ${new Date(subscription.expires_at).toLocaleDateString()}` : ""}. Renew for
            another year.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted-foreground font-sans py-12">Loading plans…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, i) => {
            if (plan.is_trial && hasUsedTrial) return null;
            const Icon = planIcon(plan);
            const isCurrent = subscription?.tier === plan.plan_key && (isActive || isTrialActive);
            const isRecommended = previousTier === plan.plan_key;

            return (
              <motion.div
                key={plan.plan_key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.is_featured ? "border-secondary bg-secondary/5 shadow-peacock" : "border-border bg-card"
                }`}
              >
                {plan.is_featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-[11px] font-sans font-semibold text-secondary-foreground">
                    Most Popular
                  </span>
                )}
                {isRecommended && !isCurrent && (
                  <span className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-[11px] font-sans font-semibold text-primary-foreground">
                    Previous Plan
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-5 w-5 text-secondary" />
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.display_name}</h3>
                </div>
                <p className="text-xs text-muted-foreground font-sans mb-1">{plan.duration_label}</p>
                {plan.price_inr != null && (
                  <p className="text-sm font-sans font-semibold text-foreground mb-4">
                    {plan.price_inr === 0 ? "Pricing coming soon" : `₹${plan.price_inr.toLocaleString("en-IN")}`}
                  </p>
                )}
                {plan.price_inr == null && <p className="text-sm font-sans font-semibold text-foreground mb-4">Free</p>}

                <ul className="flex-1 space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs font-sans text-foreground">
                      <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="rounded-lg bg-green-100 dark:bg-green-900/30 px-4 py-2.5 text-center text-sm font-sans font-semibold text-green-700 dark:text-green-300">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.plan_key)}
                    className={`rounded-lg px-4 py-2.5 text-sm font-sans font-semibold transition-opacity hover:opacity-90 ${
                      plan.is_featured ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {plan.is_trial ? "Start Free Trial" : "Subscribe"}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
