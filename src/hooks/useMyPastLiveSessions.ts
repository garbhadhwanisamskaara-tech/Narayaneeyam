import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MyPastLiveSession {
  /** live_sessions.id */
  id: string;
  challengeSessionId: string;
  parayanamName: string;
  sessionDate: string;
  startDatetime: string;
  endDatetime: string;
  youtubeUrl: string | null;
}

/**
 * Every past live session across every parayanam the signed-in user is
 * confirmed/eligible for (or owns) — for the Home-page "past sessions"
 * dropdown, which spans all of a member's parayanams rather than just one.
 *
 * Backed by the get_my_past_live_sessions() RPC, a SECURITY DEFINER function
 * that applies the same owner-or-confirmed-participant check as
 * get_live_session_recordings(); a member who isn't eligible for a given
 * parayanam simply never sees its rows.
 */
export function useMyPastLiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<MyPastLiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await (supabase as any).rpc("get_my_past_live_sessions");

    setSessions(
      ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        challengeSessionId: r.challenge_session_id,
        parayanamName: r.parayanam_name || "Parayanam",
        sessionDate: r.session_date,
        startDatetime: r.start_datetime,
        endDatetime: r.end_datetime,
        youtubeUrl: r.youtube_url ?? null,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    // Refetch occasionally so a link the owner just added shows up without a
    // full page reload.
    const id = window.setInterval(() => void load(), 5 * 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return { sessions, loading, refresh: load };
}
