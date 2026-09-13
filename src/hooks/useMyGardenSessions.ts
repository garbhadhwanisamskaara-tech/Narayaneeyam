import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HIDDEN_SESSION_STATES_FILTER } from "@/lib/parayanamFilters";

export interface MyGardenSession {
  id: string;
  label: string;
}

interface UseMyGardenSessionsOptions {
  /**
   * "active" (default): group parayanams still in progress.
   * "completed": group parayanams already finished, for read-only look-back.
   */
  view?: "active" | "completed";
}

interface UseMyGardenSessionsResult {
  sessions: MyGardenSession[];
  loading: boolean;
}

/**
 * Group parayanams the signed-in user is confirmed in and has active access
 * to (locked paid contributions are excluded). Used by the floating
 * "My Dashakam Garden" dialog. By default only active parayanams are
 * returned; pass { view: "completed" } to list finished ones instead.
 */
export function useMyGardenSessions(options?: UseMyGardenSessionsOptions): UseMyGardenSessionsResult {
  const view = options?.view ?? "active";
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
      // Group parayanams the user is confirmed in and has active access to.
      const { data: participantRows, error: participantError } = await (supabase as any)
        .from("parayanam_participants")
        .select("challenge_session_id")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .eq("access_status", "active");

      if (participantError) throw participantError;
      const groupSessionIds = Array.from(
        new Set(((participantRows ?? []) as { challenge_session_id: string }[]).map((r) => r.challenge_session_id)),
      );

      let query = (supabase as any)
        .from("challenge_sessions")
        .select("id, parayanam_name, groups(group_name), created_at")
        .in("id", groupSessionIds)
        .not("technical_state", "in", HIDDEN_SESSION_STATES_FILTER);
      query = view === "completed" ? query.not("completed_at", "is", null) : query.is("completed_at", null);

      const groupRes = groupSessionIds.length ? await query : { data: [], error: null };
      if (groupRes.error) throw groupRes.error;

      const group: (MyGardenSession & { createdAt: string })[] = ((groupRes.data ?? []) as any[]).map((s) => ({
        id: s.id as string,
        createdAt: (s.created_at ?? "") as string,
        label: s.parayanam_name ?? s.groups?.group_name ?? "Group parayanam",
      }));

      group.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setSessions(group.map(({ id, label }) => ({ id, label })));
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [user, view]);

  useEffect(() => {
    void load();
  }, [load]);

  return { sessions, loading };
}
