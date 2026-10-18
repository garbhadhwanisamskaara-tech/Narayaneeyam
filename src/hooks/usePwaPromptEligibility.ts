import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/**
 * The install prompt is offered from a member's very first signed-in visit.
 * It stays hidden only for people who already have the app (installed or the
 * Play Store app), or who chose "No" or "Maybe later".
 */
export function usePwaPromptEligibility() {
  const { user } = useAuth();
  const { isInstalled, isTwa } = usePwaInstall();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!user || isInstalled || isTwa) {
      setEligible(false);
      return;
    }

    (async () => {
      try {
        const { data: profile, error } = await (supabase as any)
          .from("profiles")
          .select("pwa_prompt_dismissed_at, pwa_prompt_snoozed_until")
          .eq("id", user.id)
          .maybeSingle();

        if (error || cancelled) return;
        if (profile?.pwa_prompt_dismissed_at) return;
        if (
          profile?.pwa_prompt_snoozed_until &&
          new Date(profile.pwa_prompt_snoozed_until).getTime() > Date.now()
        ) {
          return;
        }

        if (!cancelled) setEligible(true);
      } catch {
        // silent — never block the app on the install prompt
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isInstalled, isTwa]);

  return eligible;
}
