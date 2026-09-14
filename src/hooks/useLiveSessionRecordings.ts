import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Past-session YouTube recordings for a LIVE parayanam, keyed by
 * live_session.id.
 *
 * Reads go through the `get_live_session_recordings` RPC rather than a plain
 * select — it's a SECURITY DEFINER function that returns every session
 * (link or not) to the parayanam's owner, but only sessions that already
 * have a link to a confirmed, eligible participant. Anyone else gets an
 * empty result back, no error, so this hook never needs to know the
 * eligibility rule itself.
 */
export function useLiveSessionRecordings(challengeSessionId: string | null | undefined) {
  const [urlsBySessionId, setUrlsBySessionId] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!challengeSessionId) {
      setUrlsBySessionId(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data } = await (supabase as any).rpc("get_live_session_recordings", {
      p_challenge_session_id: challengeSessionId,
    });

    const map = new Map<string, string>();
    for (const row of (data ?? []) as any[]) {
      if (row.youtube_url) map.set(row.id, row.youtube_url as string);
    }
    setUrlsBySessionId(map);
    setLoading(false);
  }, [challengeSessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { urlsBySessionId, loading, refresh: load };
}

/** Set or replace one session's recording link (owner-only — enforced by RLS). */
export async function saveLiveSessionRecording(liveSessionId: string, youtubeUrl: string) {
  const { error } = await (supabase as any)
    .from("live_sessions")
    .update({ youtube_url: youtubeUrl.trim() })
    .eq("id", liveSessionId);
  if (error) throw error;
}

export const isValidYoutubeUrl = (url: string) => {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && /(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname);
  } catch {
    return false;
  }
};
