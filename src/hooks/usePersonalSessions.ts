import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PersonalSession {
  id: string;
  label: string;
}

interface UsePersonalSessionsResult {
  sessions: PersonalSession[];
  loading: boolean;
}

/**
 * Every active personal parayanam for the signed-in user (no group, not
 * completed), newest first. Used by the floating "My Dashakam Garden" dialog.
 */
export function usePersonalSessions(): UsePersonalSessionsResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["personal_sessions", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PersonalSession[]> => {
      const { data, error } = await (supabase as any)
        .from("challenge_sessions")
        .select("id, parayanam_name, mode, dashakams_target, start_date")
        .eq("user_id", user!.id)
        .is("group_id", null)
        .is("completed_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return ((data ?? []) as any[]).map((s) => ({
        id: s.id as string,
        label:
          s.parayanam_name ??
          `${s.dashakams_target} dashakams · started ${s.start_date}`,
      }));
    },
  });

  return { sessions: data ?? [], loading: isLoading };
}
