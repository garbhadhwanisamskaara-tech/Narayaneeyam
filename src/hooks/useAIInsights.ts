import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Insight {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
  icon: string;
}

export function useAIInsights(refreshKey: number = 0) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const result: Insight[] = [];

      // Check for Safari-specific audio errors
      const { data: errors } = await supabase
        .from("app_events")
        .select("metadata")
        .eq("event_type", "audio_error")
        .gte("created_at", last24h);

      const safariErrors = (errors || []).filter((e: any) => e.metadata?.browser === "Safari").length;
      if (safariErrors > 2) {
        result.push({ id: "safari", message: `Audio failures increasing on Safari (${safariErrors} in 24h)`, severity: "warning", icon: "🔴" });
      }

      // Check for repeat errors on same dashakam
      const dkErrors = new Map<number, number>();
      (errors || []).forEach((e: any) => {
        const dk = e.metadata?.dashakam;
        if (dk) dkErrors.set(dk, (dkErrors.get(dk) || 0) + 1);
      });
      dkErrors.forEach((count, dk) => {
        if (count >= 3) {
          result.push({ id: `dk-${dk}`, message: `Dashakam ${dk} audio failing frequently (${count} errors)`, severity: "critical", icon: "🔴" });
        }
      });

      // Check peak hours
      const { data: allPlays } = await supabase
        .from("app_events")
        .select("created_at")
        .eq("event_type", "audio_play")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const hourMap = new Map<number, number>();
      (allPlays || []).forEach((p: any) => {
        const h = new Date(p.created_at).getHours();
        hourMap.set(h, (hourMap.get(h) || 0) + 1);
      });
      let peakHour = 0, peakCount = 0;
      hourMap.forEach((c, h) => { if (c > peakCount) { peakCount = c; peakHour = h; } });
      if (peakCount > 0) {
        const label = peakHour < 12 ? "morning" : peakHour < 17 ? "afternoon" : "evening";
        result.push({ id: "peak", message: `Users listen longest in ${label} hours (${peakHour}:00)`, severity: "info", icon: "🟢" });
      }

      // Add a general insight if no data
      if (result.length === 0) {
        result.push({ id: "healthy", message: "All systems running normally — no anomalies detected", severity: "info", icon: "🟢" });
      }

      setInsights(result);
    } catch {
      setInsights([{ id: "err", message: "Could not generate insights", severity: "info", icon: "⚪" }]);
    }
    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);
  return { insights, loading, refetch: fetch };
}
