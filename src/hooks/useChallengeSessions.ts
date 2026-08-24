import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChallengeSession {
  id: string;
  user_id: string;
  mode: string;
  challenge_type: string;
  group_id: string | null;
  start_date: string;
  end_date: string | null;
  spiritual_state: string | null;
  technical_state: string;
  dashakams_target: number;
  dashakams_done: number;
  paused_at: string | null;
  completed_at: string | null;
  parent_session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface UseChallengeSessionsResult {
  sessions: ChallengeSession[];
  isLoading: boolean;
  error: Error | null;
}

export function useChallengeSessions(): UseChallengeSessionsResult {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ["challenge_sessions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<ChallengeSession[]> => {
      const { data, error } = await (supabase as any)
        .from("challenge_sessions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("technical_state", "ACTIVE")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const sessions = (data ?? []) as ChallengeSession[];
      if (sessions.length === 0) return sessions;

      // dashakams_done on the row itself is never updated by anything --
      // no trigger and no app code writes to it, so it stays at its
      // creation-time value (usually 0) forever. Compute it live instead:
      // count completed schedule rows for each session, the same way the
      // group parayanam garden and report already do.
      const sessionIds = sessions.map((s) => s.id);

      const { data: scheduleRows, error: schedErr } = await (supabase as any)
        .from("parayanam_schedule")
        .select("id, challenge_session_id")
        .in("challenge_session_id", sessionIds);

      if (schedErr) throw schedErr;

      const scheduleIds = (scheduleRows ?? []).map((r: any) => r.id);
      const scheduleToSession = new Map<string, string>(
        (scheduleRows ?? []).map((r: any) => [r.id, r.challenge_session_id]),
      );

      let doneCounts = new Map<string, number>();
      if (scheduleIds.length > 0) {
        const { data: progressRows, error: progErr } = await (supabase as any)
          .from("parayanam_member_progress")
          .select("schedule_id")
          .eq("user_id", user!.id)
          .in("schedule_id", scheduleIds);

        if (progErr) throw progErr;

        for (const row of progressRows ?? []) {
          const sessionId = scheduleToSession.get(row.schedule_id);
          if (!sessionId) continue;
          doneCounts.set(sessionId, (doneCounts.get(sessionId) ?? 0) + 1);
        }
      }

      return sessions.map((s) => ({
        ...s,
        dashakams_done: doneCounts.get(s.id) ?? 0,
      }));
    },
  });

  return {
    sessions: data ?? [],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
