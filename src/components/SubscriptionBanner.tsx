import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const { isTrialActive, isTrialExpired, isActive, isExpired, isPaused, daysRemaining, subscription, loading } = useSubscription();

  if (!user || loading || isActive) return null;

  let bg = "bg-secondary/20";
  let text = "";
  let showButton = false;
  let buttonLabel = "Subscribe";

  if (isTrialActive) {
    bg = "bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800";
    text = `Trial period — ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining. Upgrade to continue after trial ends.`;
    showButton = true;
    buttonLabel = "Upgrade";
  } else if (isTrialExpired) {
    bg = "bg-destructive/10 border-b border-destructive/20";
    text = "Your trial has ended. Subscribe to continue.";
    showButton = true;
    buttonLabel = "Subscribe";
  } else if (isExpired) {
    const expDate = subscription?.expires_at
      ? new Date(subscription.expires_at).toLocaleDateString()
      : "";
    text = `Your subscription expired${expDate ? ` on ${expDate}` : ""}. Renew to continue.`;
    bg = "bg-destructive/10 border-b border-destructive/20";
    showButton = true;
    buttonLabel = "Renew";
  } else if (isPaused) {
    bg = "bg-muted border-b border-border";
    text = "Your subscription is paused. Renew to reactivate.";
    showButton = true;
    buttonLabel = "Renew";
  } else {
    return null;
  }

  return (
    <div className={`${bg} px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground`}>
      <span>{text}</span>
      {showButton && (
        <Link
          to="/subscribe"
          className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          {buttonLabel}
        </Link>
      )}
    </div>
  );
}
