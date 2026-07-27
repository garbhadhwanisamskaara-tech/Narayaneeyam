import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const REMINDER_WINDOW_DAYS = 10;

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function SubscriptionBanner() {
  const { user, loading, isTrialActive, isTrialExpired, trialExpiresAt, profile } = useAuth();

  if (!user || loading) return null;

  // Paid subscription — remind to renew 10 days before it ends.
  if (profile && profile.subscription_status && profile.subscription_status !== "trial") {
    const endsAt = profile.subscription_end;
    const daysRemaining = endsAt ? daysUntil(endsAt) : null;
    if (
      profile.subscription_status === "active" &&
      daysRemaining !== null &&
      daysRemaining >= 0 &&
      daysRemaining <= REMINDER_WINDOW_DAYS
    ) {
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
          <span>
            🙏 Your subscription ends in {daysRemaining} {daysRemaining === 1 ? "day" : "days"} — renew to continue
            without a break.
          </span>
          <Link
            to="/subscribe"
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Renew
          </Link>
        </div>
      );
    }
    return null;
  }


  if (isTrialActive && trialExpiresAt) {
    const left = daysUntil(trialExpiresAt);
    const expiryDate = new Date(trialExpiresAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    if (left <= REMINDER_WINDOW_DAYS) {
      return (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
          <span>
            🙏 Your free trial ends in {left} {left === 1 ? "day" : "days"} ({expiryDate}) — subscribe to keep
            chanting.
          </span>
          <Link
            to="/subscribe"
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Subscribe
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>🙏 You are on a free trial valid until {expiryDate}</span>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>Your trial has ended. Please subscribe to continue.</span>
        <Link
          to="/subscribe"
          className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          Subscribe
        </Link>
      </div>
    );
  }

  return null;
}
