import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Crown, BookOpen, Mic, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useSubscriptionPlans, type SubscriptionPlan } from "@/hooks/useSubscriptionPlans";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";

/** Icon choice is a display concern, not stored data -- derived from the plan's flags. */
function planIcon(plan: SubscriptionPlan) {
  if (plan.is_trial) return BookOpen;
  if (plan.includes_learn) return Crown;
  return Mic;
}

// Loads the Razorpay Checkout script once and caches the promise so repeated
// clicks don't re-inject the <script> tag.
let razorpayScriptPromise: Promise<boolean> | null = null;
function loadRazorpayScript(): Promise<boolean> {
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function SubscribePage() {
  const { user, refreshProfile } = useAuth();
  const { subscription, hasUsedTrial, isActive, isTrialActive, loading: subLoading } = useSubscription();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const { toast } = useToast();
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planKey: string) => {
    if (!user) return;
    setProcessingPlan(planKey);

    try {
      // 1. Ask our backend to create a Razorpay order (and a matching `payments` row).
      const { data: orderData, error: orderError } = await supabase.functions.invoke("create-razorpay-order", {
        body: { plan_key: planKey },
      });

      if (orderError || orderData?.error) {
        throw new Error(orderData?.error || orderError?.message || "Could not start checkout");
      }

      // 2. Load Razorpay's Checkout script (no-op if already loaded).
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Could not load payment gateway. Check your connection and try again.");
      }

      // 3. Open the Razorpay Checkout modal with the order we just created.
      const razorpay = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Sriman Narayaneeyam",
        description: orderData.plan_display_name,
        order_id: orderData.order_id,
        prefill: {
          email: user.email ?? undefined,
        },
        theme: { color: "#0f766e" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          // 4. Verify the payment client-side for instant UI feedback.
          //    (The webhook independently activates the subscription server-side
          //    as the source of truth, so this succeeding is a bonus, not required.)
          const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-razorpay-payment", {
            body: response,
          });

          if (verifyError || verifyData?.error) {
            toast({
              title: "Payment received, confirming...",
              description:
                "Your payment went through. It may take a minute to reflect here — refresh shortly if it doesn't update automatically.",
            });
            setProcessingPlan(null);
            return;
          }

          track("subscription_started");
          toast({
            title: "Subscription activated!",
            description: `You're all set with ${orderData.plan_display_name}.`,
          });

          // Re-pull profiles/subscriptionPlan from AuthContext so the new
          // status shows up everywhere without a full page reload.
          await refreshProfile();
          setProcessingPlan(null);
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          },
        },
      });

      razorpay.on("payment.failed", (response: any) => {
        toast({
          title: "Payment failed",
          description: response?.error?.description || "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setProcessingPlan(null);
      });

      razorpay.open();
    } catch (err) {
      toast({
        title: "Couldn't start checkout",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
      setProcessingPlan(null);
    }
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
        {previousTier && subscription?.status !== "subscribed" && subscription?.status !== "trial" && (
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
            const isCurrent =
              (subscription?.plan_id === plan.id || subscription?.tier === plan.plan_key) &&
              (isActive || isTrialActive);

            const isRecommended = previousTier === plan.plan_key;
            const isProcessing = processingPlan === plan.plan_key;

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
                    disabled={isProcessing || processingPlan !== null}
                    className={`rounded-lg px-4 py-2.5 text-sm font-sans font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                      plan.is_featured ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isProcessing ? "Processing..." : plan.is_trial ? "Start Free Trial" : "Subscribe"}
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
