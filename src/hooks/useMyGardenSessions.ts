import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HIDDEN_SESSION_STATES_FILTER } from "@/lib/parayanamFilters";

export interface MyGardenSession {
  id: string;
  label: string;
}

interface UseMyGardenSessionsResult {
  sessions: MyGardenSession[];
  loading: boolean;
}

/**
 * Every parayanam the signed-in user can currently bloom something in:
 * their own personal sessions plus group parayanams they are confirmed in.
 * Used by the floating "My Dashakam Garden" dialog.
 */
export function useMyGardenSessions(): UseMyGardenSessionsResult {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MyGardenSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. True personal parayanams (no group, not completed, not hidden).
      const personalQuery = (supabase as any)
        .from("challenge_sessions")
        .select("id, parayanam_name, dashakams_target, start_date, created_at")
        .eq("user_id", user.id)
        .is("group_id", null)
        .is("completed_at", null)
        .not("technical_state", "in", HIDDEN_SESSION_STATES_FILTER)
        .order("created_at", { ascending: false });

      // 2. Group parayanams the user is confirmed in.
      const { data: participantRows, error: participantError } = await (supabase as any)
        .from("parayanam_participants")
        .select("challenge_session_id")
        .eq("user_id", user.id)
        .eq("status", "confirmed");

      if (participantError) throw participantError;
      const groupSessionIds = Array.from(
        new Set(((participantRows ?? []) as { challenge_session_id: string }[]).map((r) => r.challenge_session_id)),
      );

      const [personalRes, groupRes] = await Promise.all([
        personalQuery,
        groupSessionIds.length
          ? (supabase as any)
              .from("challenge_sessions")
              .select("id, parayanam_name, groups(group_name), created_at")
              .in("id", groupSessionIds)
              .is("completed_at", null)
              .not("technical_state", "in", HIDDEN_SESSION_STATES_FILTER)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (personalRes.error) throw personalRes.error;
      if (groupRes.error) throw groupRes.error;

      const personal: (MyGardenSession & { createdAt: string })[] = ((personalRes.data ?? []) as any[]).map(
        (s) => ({
          id: s.id as string,
          createdAt: (s.created_at ?? "") as string,
          label:
            s.parayanam_name ??
            `${s.dashakams_target} dashakams · started ${s.start_date}`,
        }),
      );

      const group: (MyGardenSession & { createdAt: string })[] = ((groupRes.data ?? []) as any[]).map((s) => ({
        id: s.id as string,
        createdAt: (s.created_at ?? "") as string,
        label: s.parayanam_name ?? s.groups?.group_name ?? "Group parayanam",
      }));

      const combined = [...personal, ...group].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSessions(combined.map(({ id, label }) => ({ id, label })));
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sessions, loading };
}
