import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns true when the signed-in user has at least one parayanam
 * participant row whose contribution has been confirmed by the Guru.
 */
export function useHasConfirmedContribution() {
  const { user } = useAuth();
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!user) {
        setHasConfirmed(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await (supabase as any)
        .from("parayanam_participants")
        .select("id")
        .eq("user_id", user.id)
        .eq("contribution_status", "confirmed")
        .limit(1);

      if (!cancelled) {
        setHasConfirmed(!error && Array.isArray(data) && data.length > 0);
        setLoading(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { hasConfirmed, loading };
}
