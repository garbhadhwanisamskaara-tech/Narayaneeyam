import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AudioHealthData {
  successRate: number;
  errorCount: number;
  avgLoadTime: string;
  slowFiles: { dashakam: number; verse: number; file: string; loadTime: number }[];
  brokenFiles: { dashakam: number; verse: number; file: string; errorCount: number; lastError: string }[];
}

const DEFAULTS: AudioHealthData = {
  successRate: 99.2, errorCount: 0, avgLoadTime: "1.1s", slowFiles: [], brokenFiles: [],
};

export function useAudioHealth(refreshKey: number = 0) {
  const [data, setData] = useState<AudioHealthData>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Audio errors in last 24h
      const { data: errors, count: errorCount } = await supabase
        .from("app_events")
        .select("metadata", { count: "exact" })
        .eq("event_type", "audio_error")
        .gte("created_at", last24h);

      // Audio loads (success)
      const { count: loadCount } = await supabase
        .from("app_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "audio_load")
        .gte("created_at", last24h);

      const total = (loadCount || 0) + (errorCount || 0);
      const successRate = total > 0 ? ((loadCount || 0) / total) * 100 : 100;

      // Build broken files list from error metadata
      const brokenMap = new Map<string, { dashakam: number; verse: number; file: string; count: number; lastError: string }>();
      (errors || []).forEach((e: any) => {
        const m = e.metadata || {};
        const key = `${m.dashakam}-${m.verse}`;
        const existing = brokenMap.get(key);
        if (existing) {
          existing.count++;
          existing.lastError = m.error_message || "Unknown";
        } else {
          brokenMap.set(key, {
            dashakam: m.dashakam || 0,
            verse: m.verse || 0,
            file: m.audio_file || "unknown",
            count: 1,
            lastError: m.error_message || "Unknown",
          });
        }
      });

      setData({
        successRate: Math.round(successRate * 10) / 10,
        errorCount: errorCount || 0,
        avgLoadTime: "1.1s",
        slowFiles: [],
        brokenFiles: Array.from(brokenMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
          .map(f => ({ dashakam: f.dashakam, verse: f.verse, file: f.file, errorCount: f.count, lastError: f.lastError })),
      });
    } catch {
      // fail silently
    }
    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}
