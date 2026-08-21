import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SUBSCRIPTION_ENABLED } from "@/config/features";


const REMINDER_WINDOW_DAYS = 10;

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export default function SubscriptionBanner() {
  const { user, loading, isTrialActive, isTrialExpired, trialExpiresAt, profile, isInGracePeriod, graceDaysRemaining } =
    useAuth();

  if (!user || loading) return null;

  const supportButton = (
    <Link
      to="/support"
      className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
    >
      Raise Ticket
    </Link>
  );

  // Subscription UI is flagged off: show only the neutral support strip, no
  // subscribe/renew nudges. Access/entitlement logic is untouched.
  if (!SUBSCRIPTION_ENABLED) {
    return (
      <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>🙏 Need help with your account or chanting?</span>
        {supportButton}
      </div>
    );
  }

  // Grace period — end date has passed but access continues for a short while.
  if (isInGracePeriod) {
    const wasTrial = !profile?.subscription_status || profile.subscription_status === "trial";
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>
          🙏 Your {wasTrial ? "free trial" : "subscription"} has ended. You have {graceDaysRemaining}{" "}
          {graceDaysRemaining === 1 ? "day" : "days"} of grace remaining — please subscribe to avoid losing access.
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/subscribe"
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Subscribe
          </Link>
          {supportButton}
        </div>
      </div>
    );
  }

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
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-foreground">
          <span>
            🙏 Your subscription ends in {daysRemaining} {daysRemaining === 1 ? "day" : "days"} — renew to continue
            without a break.
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/subscribe"
              className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Renew
            </Link>
            {supportButton}
          </div>
        </div>
      );
    }

    // Paid and up to date — still show Raise Ticket for every profile.
    return (
      <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>🙏 Need help with your account or chanting?</span>
        {supportButton}
      </div>
    );
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
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-foreground">
          <span>
            🙏 Your free trial ends in {left} {left === 1 ? "day" : "days"} ({expiryDate}) — subscribe to keep
            chanting.
          </span>
          <div className="flex items-center gap-2">
            <Link
              to="/subscribe"
              className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Subscribe
            </Link>
            {supportButton}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>🙏 You are on a free trial valid until {expiryDate}</span>
        {supportButton}
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex flex-wrap items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>Your trial has ended. Please subscribe to continue.</span>
        <div className="flex items-center gap-2">
          <Link
            to="/subscribe"
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Subscribe
          </Link>
          {supportButton}
        </div>
      </div>
    );
  }

  // Fallback for any other signed-in state.
  return (
    <div className="bg-muted/30 border-b border-border px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
      <span>🙏 Need help with your account or chanting?</span>
      {supportButton}
    </div>
  );
}
