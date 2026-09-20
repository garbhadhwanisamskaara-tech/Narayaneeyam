import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { friendlyError } from "@/lib/errorMessages";

export interface JourneyProgress {
  id: string;
  enrollment_id: string;
  user_id: string;
  journey_id: string;
  journey_day_id: string;
  opened_at: string | null;
  completed_at: string | null;
  completion_status: "NOT_STARTED" | "STARTED" | "COMPLETED";
  completion_method: "MANUAL" | "AUTOMATIC" | null;
}

interface UseJourneyProgressResult {
  progress: JourneyProgress[];
  isLoading: boolean;
  error: string | null;
  pendingDayId: string | null;
  /** Fire-and-forget -- never blocks rendering, mirrors useAudioResume's
   *  non-blocking write pattern (§15 point 1). Call when a day is opened
   *  as "today"; a no-op if it's already STARTED or COMPLETED. */
  openDay: (journeyDayId: string) => void;
  /** isLastDay flips the parent enrollment to COMPLETED in the same call
   *  (§15 point 3) -- pass whether this is the journey's final day. */
  markDayComplete: (journeyDayId: string, isLastDay: boolean) => Promise<boolean>;
  unmarkDayComplete: (journeyDayId: string) => Promise<boolean>;
}

export function useJourneyProgress(
  enrollmentId: string | undefined,
  journeyId: string | undefined,
): UseJourneyProgressResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pendingDayId, setPendingDayId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryKey = ["journey-progress", enrollmentId];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!enrollmentId,
    queryFn: async (): Promise<JourneyProgress[]> => {
      const { data, error } = await (supabase as any)
        .from("journey_progress")
        .select("*")
        .eq("enrollment_id", enrollmentId!);

      if (error) throw error;
      return (data ?? []) as JourneyProgress[];
    },
  });

  const progress = data ?? [];

  const openDay = useCallback(
    (journeyDayId: string) => {
      if (!user || !enrollmentId || !journeyId) return;

      const existing = progress.find((p) => p.journey_day_id === journeyDayId);
      if (existing && existing.completion_status !== "NOT_STARTED") return;

      // Fire-and-forget: never awaited, never blocks the dashboard render.
      void (supabase as any)
        .from("journey_progress")
        .upsert(
          {
            enrollment_id: enrollmentId,
            user_id: user.id,
            journey_id: journeyId,
            journey_day_id: journeyDayId,
            completion_status: "STARTED",
            opened_at: new Date().toISOString(),
          },
          { onConflict: "enrollment_id,journey_day_id" },
        )
        .then(({ error: err }: { error: unknown }) => {
          if (err) {
            console.error("Failed to record journey_day_opened:", err);
            return;
          }
          track("journey_day_opened", { journey_id: journeyId, journey_day_id: journeyDayId });
          void queryClient.invalidateQueries({ queryKey });
        });
    },
    [user, enrollmentId, journeyId, progress, queryClient, queryKey],
  );

  const markDayComplete = useCallback(
    async (journeyDayId: string, isLastDay: boolean): Promise<boolean> => {
      if (!user || !enrollmentId || !journeyId) return false;
      setPendingDayId(journeyDayId);
      setError(null);

      const nowIso = new Date().toISOString();

      const { error: err } = await (supabase as any).from("journey_progress").upsert(
        {
          enrollment_id: enrollmentId,
          user_id: user.id,
          journey_id: journeyId,
          journey_day_id: journeyDayId,
          completion_status: "COMPLETED",
          completed_at: nowIso,
          completion_method: "MANUAL",
        },
        { onConflict: "enrollment_id,journey_day_id" },
      );

      if (err) {
        setPendingDayId(null);
        setError(friendlyError(err, "Could not mark this day complete. Please try again."));
        return false;
      }

      track("journey_day_completed", { journey_id: journeyId, journey_day_id: journeyDayId });

      // Completing the final day flips the enrollment to COMPLETED, in the
      // same user action as the final day's completion write (§15 point 3).
      // Not a real DB transaction (two separate calls), matching how
      // useCompleteDashakam's personal-progress mirror is also a second,
      // best-effort call rather than an atomic one.
      if (isLastDay) {
        const { error: enrollErr } = await (supabase as any)
          .from("journey_enrollments")
          .update({ status: "COMPLETED", completed_at: nowIso })
          .eq("id", enrollmentId)
          .eq("user_id", user.id);

        if (enrollErr) {
          console.error("Failed to mark enrollment COMPLETED:", enrollErr.message);
        } else {
          track("journey_completed", { journey_id: journeyId });
        }
        await queryClient.invalidateQueries({ queryKey: ["journey-enrollment", journeyId, user.id] });
      }

      setPendingDayId(null);
      await queryClient.invalidateQueries({ queryKey });
      return true;
    },
    [user, enrollmentId, journeyId, queryClient, queryKey],
  );

  const unmarkDayComplete = useCallback(
    async (journeyDayId: string): Promise<boolean> => {
      if (!user || !enrollmentId) return false;
      setPendingDayId(journeyDayId);
      setError(null);

      const { error: err } = await (supabase as any)
        .from("journey_progress")
        .update({ completion_status: "STARTED", completed_at: null, completion_method: null })
        .eq("enrollment_id", enrollmentId)
        .eq("journey_day_id", journeyDayId)
        .eq("user_id", user.id);

      setPendingDayId(null);

      if (err) {
        setError(friendlyError(err, "Could not undo this completion. Please try again."));
        return false;
      }

      await queryClient.invalidateQueries({ queryKey });
      return true;
    },
    [user, enrollmentId, queryClient, queryKey],
  );

  return {
    progress,
    isLoading,
    error,
    pendingDayId,
    openDay,
    markDayComplete,
    unmarkDayComplete,
  };
}
