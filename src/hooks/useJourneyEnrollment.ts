import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { track } from "@/lib/analytics";
import { friendlyError } from "@/lib/errorMessages";
import { getCurrentDay } from "@/lib/journeyDay";
import type { JourneyRun } from "@/hooks/useJourney";

export interface JourneyEnrollment {
  id: string;
  user_id: string;
  attempt_number: number;
  journey_id: string;
  run_id: string;
  status: "ACTIVE" | "COMPLETED" | "PAUSED" | "LEFT";
  joined_at: string;
  effective_start_date: string;
  completed_at: string | null;
  left_at: string | null;
}

interface UseJourneyEnrollmentResult {
  /** The user's most recent attempt at this journey (any status), or null
   *  if they've never enrolled. Only one row can be ACTIVE at a time. */
  enrollment: JourneyEnrollment | null;
  /** The run referenced by the latest enrollment, including closed runs. */
  enrolledRun: JourneyRun | null;
  /** null until there's an ACTIVE enrollment and a duration_days to clamp against. */
  currentDay: number | null;
  isLoading: boolean;
  error: string | null;
  isPending: boolean;
  join: (runId: string) => Promise<boolean>;
  leave: () => Promise<boolean>;
  /** Flips a LEFT enrollment back to ACTIVE -- no new effective_start_date,
   *  so a self-paced user resumes exactly where their calendar math left
   *  them (§18: "user sets LEFT then wants to rejoin"). */
  resume: () => Promise<boolean>;
}

export function useJourneyEnrollment(
  journeyId: string | undefined,
  durationDays: number | undefined,
): UseJourneyEnrollmentResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = ["journey-enrollment", journeyId, user?.id];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: !!journeyId && !!user,
    queryFn: async (): Promise<{ enrollment: JourneyEnrollment | null; enrolledRun: JourneyRun | null }> => {
      if (!journeyId || !user) return { enrollment: null, enrolledRun: null };

      const { data: enrollmentData, error } = await (supabase as any)
        .from("journey_enrollments")
        .select("*")
        .eq("journey_id", journeyId)
        .eq("user_id", user.id)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const enrollment = (enrollmentData ?? null) as JourneyEnrollment | null;
      if (!enrollment) return { enrollment: null, enrolledRun: null };

      const { data: runData, error: runError } = await (supabase as any)
        .from("journey_runs")
        .select("*")
        .eq("id", enrollment.run_id)
        .maybeSingle();

      if (runError) throw runError;
      return { enrollment, enrolledRun: (runData ?? null) as JourneyRun | null };
    },
  });

  const enrollment = data?.enrollment ?? null;
  const enrolledRun = data?.enrolledRun ?? null;

  const join = useCallback(
    async (runId: string): Promise<boolean> => {
      if (!user || !journeyId) return false;
      setIsPending(true);
      setError(null);

      // effective_start_date is computed server-side by the
      // set_journey_enrollment_effective_start_date trigger -- never sent
      // from the client, so it can't be spoofed.
      const { error: err } = await (supabase as any).from("journey_enrollments").insert({
        user_id: user.id,
        journey_id: journeyId,
        run_id: runId,
      });

      setIsPending(false);

      if (err) {
        setError(friendlyError(err, "Could not join this journey. Please try again."));
        return false;
      }

      track("journey_joined", { journey_id: journeyId });
      await queryClient.invalidateQueries({ queryKey });
      return true;
    },
    [user, journeyId, queryClient, queryKey],
  );

  const leave = useCallback(async (): Promise<boolean> => {
    if (!user || !enrollment) return false;
    setIsPending(true);
    setError(null);

    const { error: err } = await (supabase as any)
      .from("journey_enrollments")
      .update({ status: "LEFT", left_at: new Date().toISOString() })
      .eq("id", enrollment.id)
      .eq("user_id", user.id);

    setIsPending(false);

    if (err) {
      setError(friendlyError(err, "Could not leave this journey. Please try again."));
      return false;
    }

    await queryClient.invalidateQueries({ queryKey });
    return true;
  }, [user, enrollment, queryClient, queryKey]);

  const resume = useCallback(async (): Promise<boolean> => {
    if (!user || !enrollment) return false;
    setIsPending(true);
    setError(null);

    const { error: err } = await (supabase as any)
      .from("journey_enrollments")
      .update({ status: "ACTIVE", left_at: null })
      .eq("id", enrollment.id)
      .eq("user_id", user.id);

    setIsPending(false);

    if (err) {
      setError(friendlyError(err, "Could not resume this journey. Please try again."));
      return false;
    }

    await queryClient.invalidateQueries({ queryKey });
    return true;
  }, [user, enrollment, queryClient, queryKey]);

  const currentDay =
    enrollment && enrollment.status === "ACTIVE" && durationDays
      ? getCurrentDay(enrollment.effective_start_date, durationDays)
      : null;

  return { enrollment, enrolledRun, currentDay, isLoading, error, isPending, join, leave, resume };
}
