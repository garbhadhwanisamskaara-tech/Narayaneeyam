import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DailySession { date: string; count: number }
interface TopDashakam { dashakam: number; plays: number }

interface ChantAnalytics {
  dailySessions: DailySession[];
  topDashakams: TopDashakam[];
}

export function useChantAnalytics(days: number = 7, refreshKey: number = 0) {
  const [data, setData] = useState<ChantAnalytics>({ dailySessions: [], topDashakams: [] });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      // Daily chant sessions
      const { data: sessions } = await supabase
        .from("app_events")
        .select("created_at")
        .eq("event_type", "chant_started")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      const dailyMap = new Map<string, number>();
      (sessions || []).forEach((s: any) => {
        const d = new Date(s.created_at).toLocaleDateString("en-US", { weekday: "short" });
        dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
      });
      const dailySessions = Array.from(dailyMap, ([date, count]) => ({ date, count }));

      // Top dashakams by plays
      const { data: plays } = await supabase
        .from("app_events")
        .select("metadata")
        .eq("event_type", "audio_play")
        .gte("created_at", since);

      const dMap = new Map<number, number>();
      (plays || []).forEach((p: any) => {
        const dk = p.metadata?.dashakam;
        if (dk) dMap.set(dk, (dMap.get(dk) || 0) + 1);
      });
      const topDashakams = Array.from(dMap, ([dashakam, plays]) => ({ dashakam, plays }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      setData({ dailySessions, topDashakams });
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [days, refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}
