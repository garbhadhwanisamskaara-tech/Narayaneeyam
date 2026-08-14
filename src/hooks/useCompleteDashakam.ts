import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Per-person dashakam completion. Each chanter records their own row in
 * parayanam_member_progress, so several people can complete the same
 * scheduled dashakam independently.
 */
export function useCompleteDashakam() {
  const { user } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markDashakamComplete = useCallback(
    async (scheduleRowId: string): Promise<boolean> => {
      if (!user || !scheduleRowId) return false;
      setPendingId(scheduleRowId);
      setError(null);
      const { error: err } = await (supabase as any)
        .from("parayanam_member_progress")
        .insert({
          schedule_id: scheduleRowId,
          user_id: user.id,
          completed_at: new Date().toISOString(),
        });
      setPendingId(null);
      if (err) {
        setError(err.message);
        return false;
      }
      return true;
    },
    [user]
  );

  const unmarkDashakamComplete = useCallback(
    async (scheduleRowId: string): Promise<boolean> => {
      if (!user || !scheduleRowId) return false;
      setPendingId(scheduleRowId);
      setError(null);
      const { error: err } = await (supabase as any)
        .from("parayanam_member_progress")
        .delete()
        .eq("schedule_id", scheduleRowId)
        .eq("user_id", user.id);
      setPendingId(null);
      if (err) {
        setError(err.message);
        return false;
      }
      return true;
    },
    [user]
  );

  return { markDashakamComplete, unmarkDashakamComplete, pendingId, error };
}
