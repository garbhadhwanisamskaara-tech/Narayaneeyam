import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { useSessionParticipants } from "@/hooks/useParayanamParticipants";
import { isParticipantEligible } from "@/lib/parayanamEligibility";
import type { GardenTile } from "@/hooks/useSessionGarden";

interface ScheduleRow {
  id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
}

/**
 * Personal version of the parayanam garden. Mirrors useSessionGarden's
 * structure and tile shape, but bloom intensity is binary and entirely
 * personal: a dashakam is 100% bloomed once the signed-in user has
 * completed it, otherwise 0%. Group-wide aggregates play no part, and the
 * user_progress query is scoped to the current user only.
 */
export function useMyDashakamGarden(sessionId: string | null | undefined) {
  const { user } = useAuth();
  const { participants } = useSessionParticipants(sessionId ?? undefined);
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [progress, setProgress] = useState<{ dashakam_no: number; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);

  const [participationType, setParticipationType] = useState<string | null>(null);

  const eligibleParticipants = useMemo(
    () => participants.filter((p) => isParticipantEligible(p, participationType)),
    [participants, participationType],
  );
  const isConfirmedParticipant = useMemo(
    () => !!user && eligibleParticipants.some((p) => p.user_id === user.id),
    [eligibleParticipants, user],
  );

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setProgress([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: sess } = await (supabase as any)
      .from("challenge_sessions")
      .select("participation_type")
      .eq("id", sessionId)
      .maybeSingle();
    setParticipationType((sess as any)?.participation_type ?? null);
    const { data } = await (supabase as any)
      .from("parayanam_schedule")
      .select("id, dashakam_no, scheduled_date, assigned_user_id")
      .eq("challenge_session_id", sessionId)
      .order("scheduled_date", { ascending: true })
      .order("dashakam_no", { ascending: true });
    const scheduleRows = (data ?? []) as ScheduleRow[];
    setRows(scheduleRows);

    // Personal garden: only this user's own completions are relevant.
    if (user) {
      const { data: prog } = await (supabase as any)
        .from("user_progress")
        .select("dashakam_no, user_id")
        .eq("challenge_session_id", sessionId)
        .eq("user_id", user.id);
      setProgress((prog ?? []) as { dashakam_no: number; user_id: string }[]);
    } else {
      setProgress([]);
    }
    setLoading(false);
  }, [sessionId, user]);

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

    const mineDashakams = new Set<number>();
    for (const p of progress) {
      if (user && p.user_id === user.id) mineDashakams.add(p.dashakam_no);
    }

    const map = new Map<number, GardenTile>();
    for (const [no, list] of byDashakam) {
      const mine = mineDashakams.has(no);
      const canTap =
        !!user &&
        isConfirmedParticipant &&
        list.some((r) => (r.assigned_user_id ? r.assigned_user_id === user.id : true));
      // done/total only drive the tile's "x/y" label; percent is personal.
      const done = mine ? list.length : 0;
      const total = list.length;
      map.set(no, {
        dashakam_no: no,
        scheduleIds: list.map((r) => r.id),
        mineDone: mine ? list.length : 0,
        mineRowIds: mine ? list.map((r) => r.id) : [],
        done,
        total,
        canTap,
        percent: mine ? 100 : 0,
      });
    }
    return map;
  }, [rows, progress, user, isConfirmedParticipant]);

  const blooms = useMemo(() => {
    const m = new Map<number, number>();
    for (const [no, t] of tiles) m.set(no, t.percent);
    return m;
  }, [tiles]);

  const dashakamNumbers = useMemo(() => Array.from(tiles.keys()).sort((a, b) => a - b), [tiles]);

  /** Toggle the current user's completion for a dashakam, then refetch everything. */
  const toggleDashakam = useCallback(
    async (dashakamNo: number) => {
      const tile = tiles.get(dashakamNo);
      if (!tile || !tile.canTap || !user) return;
      const eligible = rows.filter(
        (r) =>
          r.dashakam_no === dashakamNo &&
          isConfirmedParticipant &&
          (r.assigned_user_id ? r.assigned_user_id === user.id : true),
      );
      if (!eligible.length) return;
      const undo = tile.mineDone >= eligible.length;
      setPending(dashakamNo);
      const mine = new Set(tile.mineRowIds);
      for (const row of eligible) {
        if (undo) {
          if (mine.has(row.id)) await unmarkDashakamComplete(row.id);
        } else if (!mine.has(row.id)) {
          await markDashakamComplete(row.id);
        }
      }
      setPending(null);
      await refresh();
    },
    [tiles, rows, user, isConfirmedParticipant, markDashakamComplete, unmarkDashakamComplete, refresh],
  );

  return {
    tiles,
    blooms,
    dashakamNumbers,
    loading,
    pending,
    refresh,
    toggleDashakam,
    hasSchedule: rows.length > 0,
  };
}
