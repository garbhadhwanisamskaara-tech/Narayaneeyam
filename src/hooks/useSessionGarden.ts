import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { useSessionParticipants } from "@/hooks/useParayanamParticipants";

interface ScheduleRow {
  id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
}

export interface GardenTile {
  dashakam_no: number;
  /** Schedule rows for this dashakam (usually one). */
  scheduleIds: string[];
  /** Rows the current user has completed. */
  mineDone: number;
  /** Completions recorded by anyone. */
  done: number;
  /** Expected completions once everyone confirmed has chanted it. */
  total: number;
  canTap: boolean;
  /** 0–100 bloom intensity. */
  percent: number;
}

/**
 * Single source of truth for a group parayanam's garden: the schedule rows,
 * everyone's completions and the current user's own taps. Any completion write
 * refreshes all of it together so the garden, its header count and the
 * schedule views never drift apart.
 */
export function useSessionGarden(sessionId: string | null | undefined) {
  const { user } = useAuth();
  const { participants } = useSessionParticipants(sessionId ?? undefined);
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [progress, setProgress] = useState<{ schedule_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);

  const confirmedCount = useMemo(
    () => participants.filter((p) => p.status === "confirmed").length,
    [participants]
  );
  const isConfirmedParticipant = useMemo(
    () => !!user && participants.some((p) => p.user_id === user.id && p.status === "confirmed"),
    [participants, user]
  );

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setProgress([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("parayanam_schedule")
      .select("id, dashakam_no, scheduled_date, assigned_user_id")
      .eq("challenge_session_id", sessionId)
      .order("scheduled_date", { ascending: true })
      .order("dashakam_no", { ascending: true });
    const scheduleRows = (data ?? []) as ScheduleRow[];
    setRows(scheduleRows);

    const ids = scheduleRows.map((r) => r.id);
    if (ids.length) {
      const { data: prog } = await (supabase as any)
        .from("parayanam_member_progress")
        .select("schedule_id, user_id")
        .in("schedule_id", ids);
      setProgress((prog ?? []) as { schedule_id: string; user_id: string }[]);
    } else {
      setProgress([]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tiles = useMemo(() => {
    const byDashakam = new Map<number, ScheduleRow[]>();
    for (const r of rows) {
      const list = byDashakam.get(r.dashakam_no) ?? [];
      list.push(r);
      byDashakam.set(r.dashakam_no, list);
    }

    const doneByRow = new Map<string, number>();
    const mineRows = new Set<string>();
    for (const p of progress) {
      doneByRow.set(p.schedule_id, (doneByRow.get(p.schedule_id) ?? 0) + 1);
      if (user && p.user_id === user.id) mineRows.add(p.schedule_id);
    }

    const map = new Map<number, GardenTile>();
    for (const [no, list] of byDashakam) {
      const done = list.reduce((sum, r) => sum + (doneByRow.get(r.id) ?? 0), 0);
      const mineDone = list.filter((r) => mineRows.has(r.id)).length;
      // Split mode assigns one chanter per row; synchronized expects everyone.
      const expectedPerRow = list.some((r) => r.assigned_user_id) ? 1 : Math.max(confirmedCount, 1);
      const total = list.length * expectedPerRow;
      const canTap =
        !!user &&
        list.some((r) => (r.assigned_user_id ? r.assigned_user_id === user.id : isConfirmedParticipant));
      map.set(no, {
        dashakam_no: no,
        scheduleIds: list.map((r) => r.id),
        mineDone,
        done,
        total,
        canTap,
        percent: total > 0 ? Math.min(100, (done / total) * 100) : 0,
      });
    }
    return map;
  }, [rows, progress, user, confirmedCount, isConfirmedParticipant]);

  const blooms = useMemo(() => {
    const m = new Map<number, number>();
    for (const [no, t] of tiles) m.set(no, t.percent);
    return m;
  }, [tiles]);

  const dashakamNumbers = useMemo(
    () => Array.from(tiles.keys()).sort((a, b) => a - b),
    [tiles]
  );

  /** Toggle the current user's completion for a dashakam, then refetch everything. */
  const toggleDashakam = useCallback(
    async (dashakamNo: number) => {
      const tile = tiles.get(dashakamNo);
      if (!tile || !tile.canTap || !user) return;
      const eligible = rows.filter(
        (r) =>
          r.dashakam_no === dashakamNo &&
          (r.assigned_user_id ? r.assigned_user_id === user.id : isConfirmedParticipant)
      );
      if (!eligible.length) return;
      const undo = tile.mineDone >= eligible.length;
      setPending(dashakamNo);
      for (const row of eligible) {
        if (undo) await unmarkDashakamComplete(row.id);
        else await markDashakamComplete(row.id);
      }
      setPending(null);
      await refresh();
    },
    [tiles, rows, user, isConfirmedParticipant, markDashakamComplete, unmarkDashakamComplete, refresh]
  );

  return {
    tiles,
    blooms,
    dashakamNumbers,
    confirmedCount,
    loading,
    pending,
    refresh,
    toggleDashakam,
    hasSchedule: rows.length > 0,
  };
}
