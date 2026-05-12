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
      return (data ?? []) as ChallengeSession[];
    },
  });

  return {
    sessions: data ?? [],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
