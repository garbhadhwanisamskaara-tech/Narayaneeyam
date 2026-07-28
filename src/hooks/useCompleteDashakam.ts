import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Marks a parayanam_schedule row complete — only when the row is assigned to the
 * current user and is not already completed.
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
      const { data, error: err } = await (supabase as any)
        .from("parayanam_schedule")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_via: "manual",
        })
        .eq("id", scheduleRowId)
        .eq("assigned_user_id", user.id)
        .eq("completed", false)
        .select("id");
      setPendingId(null);
      if (err) {
        setError(err.message);
        return false;
      }
      return Array.isArray(data) && data.length > 0;
    },
    [user]
  );

  return { markDashakamComplete, pendingId, error };
}
