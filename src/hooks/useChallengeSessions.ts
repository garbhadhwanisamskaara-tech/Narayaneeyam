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
      // creation-time value (usually 0) forever. Compute it live instead,
      // from user_progress (pathway_id = the session's own id), the same
      // single source of truth the garden and report now read from too.
      const sessionIds = sessions.map((s) => s.id);

      const { data: progressRows, error: progErr } = await (supabase as any)
        .from("user_progress")
        .select("challenge_session_id")
        .eq("user_id", user!.id)
        .in("challenge_session_id", sessionIds);

      if (progErr) throw progErr;

      const doneCounts = new Map<string, number>();
      for (const row of progressRows ?? []) {
        const sessionId = row.challenge_session_id;
        doneCounts.set(sessionId, (doneCounts.get(sessionId) ?? 0) + 1);
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
