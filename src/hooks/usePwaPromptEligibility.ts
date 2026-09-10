import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const VISIT_KEY = "pwa_visit_count";
const SESSION_KEY = "pwa_visit_counted";

/** Counts one visit per browser session (no existing app-wide visit counter exists). */
function bumpVisitCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const current = Number(localStorage.getItem(VISIT_KEY) ?? "0") || 0;
    if (sessionStorage.getItem(SESSION_KEY)) return current;
    const next = current + 1;
    localStorage.setItem(VISIT_KEY, String(next));
    sessionStorage.setItem(SESSION_KEY, "1");
    return next;
  } catch {
    return 0;
  }
}

export function usePwaPromptEligibility() {
  const { user } = useAuth();
  const { isInstalled, isTwa } = usePwaInstall();
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const visits = bumpVisitCount();

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

        if (visits >= 2) {
          if (!cancelled) setEligible(true);
          return;
        }

        // Otherwise: has the user ever completed a Dashakam?
        const { count } = await (supabase as any)
          .from("user_progress")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!cancelled && (count ?? 0) > 0) setEligible(true);
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
