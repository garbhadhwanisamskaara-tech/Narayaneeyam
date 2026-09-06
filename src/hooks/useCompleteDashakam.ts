import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { friendlyError } from "@/lib/errorMessages";

/**
 * Per-person dashakam completion. Each chanter records their own row in
 * parayanam_member_progress, so several people can complete the same
 * scheduled dashakam independently.
 *
 * Also mirrors the completion into user_progress, so a dashakam completed
 * inside a parayanam counts toward the chanter's own personal total too --
 * not just the parayanam's.
 *
 * pathway_id is set to the parayanam's own challenge_session_id (not a
 * fixed string) so that completing the same dashakam number in two
 * different parayanams creates two separate rows, rather than colliding
 * under the (user_id, pathway_id, dashakam_no) unique constraint. Solo
 * Chant/Learn completions keep using pathway_id: "chant"/"learn" as
 * before, so this doesn't change their behaviour at all.
 *
 * method is set to "manual" -- the only value user_progress's check
 * constraint allows for a self-attested completion, regardless of
 * whether the person actually chanted, listened via Podcast, or read
 * offline outside the app entirely.
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

      // Look up the dashakam number + parayanam this schedule row belongs
      // to, needed for the personal-progress mirror below.
      const { data: scheduleRow, error: scheduleErr } = await (supabase as any)
        .from("parayanam_schedule")
        .select("dashakam_no, challenge_session_id")
        .eq("id", scheduleRowId)
        .single();

      if (scheduleErr || !scheduleRow) {
        setPendingId(null);
        setError(scheduleErr?.message ?? "Could not find schedule row");
        return false;
      }

      const nowIso = new Date().toISOString();

      const { error: err } = await (supabase as any).from("parayanam_member_progress").insert({
        schedule_id: scheduleRowId,
        user_id: user.id,
        completed_at: nowIso,
      });

      if (err) {
        setPendingId(null);
        setError(err.message);
        return false;
      }

      // Mirror into user_progress so this also counts toward the user's
      // own personal total. Upsert (not plain insert) so an accidental
      // double-fire updates the existing row instead of erroring.
      // Not fatal if this second write fails -- the parayanam completion
      // above already succeeded -- but we do log it.
      const { error: personalErr } = await (supabase as any).from("user_progress").upsert(
        {
          user_id: user.id,
          dashakam_no: scheduleRow.dashakam_no,
          pathway_id: scheduleRow.challenge_session_id,
          challenge_session_id: scheduleRow.challenge_session_id,
          completed_date: nowIso.split("T")[0],
          completed_at: nowIso,
          method: "manual",
        },
        { onConflict: "user_id,pathway_id,dashakam_no" },
      );

      if (personalErr) {
        console.error("Failed to mirror completion into user_progress:", personalErr.message);
      }

      setPendingId(null);
      track("dashakam_completed");
      return true;
    },
    [user],
  );

  const unmarkDashakamComplete = useCallback(
    async (scheduleRowId: string): Promise<boolean> => {
      if (!user || !scheduleRowId) return false;
      setPendingId(scheduleRowId);
      setError(null);

      // Same lookup, needed to find the matching user_progress row to remove.
      const { data: scheduleRow } = await (supabase as any)
        .from("parayanam_schedule")
        .select("dashakam_no, challenge_session_id")
        .eq("id", scheduleRowId)
        .single();

      const { error: err } = await (supabase as any)
        .from("parayanam_member_progress")
        .delete()
        .eq("schedule_id", scheduleRowId)
        .eq("user_id", user.id);

      if (err) {
        setPendingId(null);
        setError(err.message);
        return false;
      }

      // Remove the mirrored personal-progress row too, so undoing a
      // lotus-tap doesn't leave a stale completion in the personal count.
      if (scheduleRow) {
        const { error: personalErr } = await (supabase as any)
          .from("user_progress")
          .delete()
          .eq("user_id", user.id)
          .eq("pathway_id", scheduleRow.challenge_session_id)
          .eq("dashakam_no", scheduleRow.dashakam_no);

        if (personalErr) {
          console.error("Failed to remove mirrored user_progress row:", personalErr.message);
        }
      }

      setPendingId(null);
      return true;
    },
    [user],
  );

  return { markDashakamComplete, unmarkDashakamComplete, pendingId, error };
}
