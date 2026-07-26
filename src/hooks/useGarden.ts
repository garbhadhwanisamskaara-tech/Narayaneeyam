import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GardenLotus {
  dashakam_no: number;
  bloom_percent: number;
}

/**
 * Group garden — bloom intensity per dashakam from get_group_garden(p_group_id).
 */
export function useGroupGarden(groupId?: string) {
  const [blooms, setBlooms] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setBlooms(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await (supabase as any).rpc("get_group_garden", {
      p_group_id: groupId,
    });
    if (err) {
      setError(err.message);
      setBlooms(new Map());
    } else {
      const map = new Map<number, number>();
      for (const row of (data ?? []) as any[]) {
        const no = Number(row.dashakam_no ?? row.dashakam);
        const pct = Number(row.bloom_percent ?? 0);
        if (no) map.set(no, Math.max(0, Math.min(100, pct)));
      }
      setBlooms(map);
      setError(null);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { blooms, loading, error, refresh };
}
