import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function SubscriptionBanner() {
  const { user, loading, isTrialActive, isTrialExpired, trialExpiresAt, profile } = useAuth();

  if (!user || loading) return null;

  // If user has a non-trial plan, don't show trial banner
  if (profile && profile.plan !== "trial") return null;

  if (isTrialActive && trialExpiresAt) {
    const expiryDate = new Date(trialExpiresAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>🙏 You are on a free trial valid until {expiryDate}</span>
      </div>
    );
  }

  if (isTrialExpired) {
    return (
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 flex items-center justify-center gap-3 text-xs font-sans text-foreground">
        <span>Your trial has ended. Please upgrade to continue.</span>
        <Link
          to="/trial-expired"
          className="rounded-md bg-primary px-3 py-1 text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return null;
}
