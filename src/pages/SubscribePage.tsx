import { motion } from "framer-motion";
import { Check, Crown, BookOpen, Mic, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

const plans = [
  {
    id: "trial",
    name: "Free Trial",
    duration: "1 Month",
    icon: BookOpen,
    features: ["5 sample dashakams", "Chant and Learn modes", "Basic lesson plan"],
    trialOnly: true,
  },
  {
    id: "chanting",
    name: "Chanting",
    duration: "Annual",
    icon: Mic,
    features: ["All 100 dashakams — Chant mode", "Podcast access", "Ritual chants and slokas"],
  },
  {
    id: "learner",
    name: "Learner",
    duration: "Annual",
    icon: BookOpen,
    features: ["All 100 dashakams — Chant & Learn", "Lesson plan & streak tracking", "Script library access"],
  },
  {
    id: "premium",
    name: "Premium",
    duration: "Annual",
    icon: Crown,
    features: ["Everything in Learner", "Podcast access", "All 7 languages", "Priority support"],
    highlight: true,
  },
];

export default function SubscribePage() {
  const { user } = useAuth();
  const { subscription, hasUsedTrial, isActive, isTrialActive, loading } = useSubscription();
  const { toast } = useToast();

  const handleSubscribe = (planId: string) => {
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
          <Link to="/auth" className="rounded-lg bg-primary px-6 py-2.5 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const previousTier = subscription?.tier;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SEO path="/subscribe" title="Subscribe — Sriman Narayaneeyam" description="Choose a plan to unlock all 100 Dashakams of Sriman Narayaneeyam — Chant, Podcast, Script Library and more." />
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Choose Your Plan</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">
          Continue your devotional journey with Sriman Narayaneeyam
        </p>
        {previousTier && subscription?.status !== "active" && subscription?.status !== "trial" && (
          <p className="text-sm text-secondary font-sans mt-2">
            Welcome back! Your {previousTier} subscription expired
            {subscription?.expires_at ? ` on ${new Date(subscription.expires_at).toLocaleDateString()}` : ""}.
            Renew for another year.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan, i) => {
          if (plan.trialOnly && hasUsedTrial) return null;
          const isCurrent = subscription?.tier === plan.id && (isActive || isTrialActive);
          const isRecommended = previousTier === plan.id;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? "border-secondary bg-secondary/5 shadow-peacock"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
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
                <plan.icon className="h-5 w-5 text-secondary" />
                <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground font-sans mb-4">{plan.duration}</p>

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
                  onClick={() => handleSubscribe(plan.id)}
                  className={`rounded-lg px-4 py-2.5 text-sm font-sans font-semibold transition-opacity hover:opacity-90 ${
                    plan.highlight
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {plan.trialOnly ? "Start Free Trial" : "Subscribe"}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
