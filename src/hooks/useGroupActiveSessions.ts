import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ActiveGroupSession {
  id: string;
  start_date: string;
  end_date: string | null;
  dashakam_set_id: string | null;
  dashakams_target: number;
  parayanam_name: string | null;
  set_name: string;
}

const fmt = (d: string | null) =>
  d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "open-ended";

export function sessionLabel(s: ActiveGroupSession) {
  return `${s.parayanam_name || s.set_name} · ${fmt(s.start_date)} – ${fmt(s.end_date)}`;
}

/** All ACTIVE group parayanams for a group, with their dashakam set name. */
export function useGroupActiveSessions(groupId: string | undefined) {
  const [sessions, setSessions] = useState<ActiveGroupSession[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("challenge_sessions")
      .select("id, start_date, end_date, dashakam_set_id, dashakams_target, parayanam_name")
      .eq("group_id", groupId)
      .in("challenge_type", ["group_standard", "group_relay"])
      .eq("technical_state", "ACTIVE")
      .order("start_date", { ascending: false });

    const rows = (data ?? []) as Omit<ActiveGroupSession, "set_name">[];
    const setIds = Array.from(new Set(rows.map((r) => r.dashakam_set_id).filter(Boolean))) as string[];
    let names = new Map<string, string>();
    if (setIds.length) {
      const { data: setRows } = await (supabase as any)
        .from("dashakam_sets")
        .select("id, set_name")
        .in("id", setIds);
      names = new Map(((setRows ?? []) as any[]).map((s) => [s.id, s.set_name]));
    }

    setSessions(
      rows.map((r) => ({
        ...r,
        set_name:
          (r.dashakam_set_id && names.get(r.dashakam_set_id)) ||
          `${r.dashakams_target} dashakams`,
      }))
    );
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
