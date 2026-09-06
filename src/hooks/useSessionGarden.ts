import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { useSessionParticipants } from "@/hooks/useParayanamParticipants";
import { isParticipantEligible } from "@/lib/parayanamEligibility";

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
  /** Schedule row ids the current user has completed. */
  mineRowIds: string[];
  /** Completions recorded by anyone. */
  done: number;
  /** Expected completions once everyone confirmed has chanted it. */
  total: number;
  canTap: boolean;
  /** 0–100 bloom intensity. */
  percent: number;
  /** Scheduled date for this dashakam, if any. */
  scheduled_date: string | null;
}

/**
 * Single source of truth for a group parayanam's garden: the schedule rows,
 * everyone's completions and the current user's own taps. Any completion write
 * refreshes all of it together so the garden, its header count and the
 * schedule views never drift apart.
 *
 * Completions are read from user_progress, keyed by (challenge_session_id,
 * dashakam_no, user_id) rather than schedule_id -- confirmed safe: no
 * session has ever assigned the same user more than one schedule row for
 * the same dashakam number, so this loses no information versus the old
 * parayanam_member_progress-based lookup.
 */
export function useSessionGarden(sessionId: string | null | undefined) {
  const { user } = useAuth();
  const { participants } = useSessionParticipants(sessionId ?? undefined);
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [progress, setProgress] = useState<{ dashakam_no: number; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);

  const [participationType, setParticipationType] = useState<string | null>(null);

  // FREE: accepted is enough. PAID: the Guru must have approved the
  // contribution (contribution_status confirmed + access_status active).
  const eligibleParticipants = useMemo(
    () => participants.filter((p) => isParticipantEligible(p, participationType)),
    [participants, participationType],
  );
  const confirmedCount = eligibleParticipants.length;
  const isConfirmedParticipant = useMemo(
    () => !!user && eligibleParticipants.some((p) => p.user_id === user.id),
    [eligibleParticipants, user],
  );


  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setProgress([]);
      setStartDate(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: sess } = await (supabase as any)
      .from("challenge_sessions")
      .select("participation_type, start_date")
      .eq("id", sessionId)
      .maybeSingle();
    setParticipationType((sess as any)?.participation_type ?? null);
    setStartDate((sess as any)?.start_date ?? null);
    const { data } = await (supabase as any)
      .from("parayanam_schedule")
      .select("id, dashakam_no, scheduled_date, assigned_user_id")
      .eq("challenge_session_id", sessionId)
      .order("scheduled_date", { ascending: true })
      .order("dashakam_no", { ascending: true });
    const scheduleRows = (data ?? []) as ScheduleRow[];
    setRows(scheduleRows);

    const { data: prog } = await (supabase as any)
      .from("user_progress")
      .select("dashakam_no, user_id")
      .eq("challenge_session_id", sessionId);
    setProgress((prog ?? []) as { dashakam_no: number; user_id: string }[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tiles = useMemo(() => {
    // The parayanam only becomes tappable on/after its start_date. A missing
    // start_date counts as already started.
    const today = new Date().toLocaleDateString("sv-SE");
    const hasStarted = !startDate || today >= startDate;

    const byDashakam = new Map<number, ScheduleRow[]>();
    for (const r of rows) {
      const list = byDashakam.get(r.dashakam_no) ?? [];
      list.push(r);
      byDashakam.set(r.dashakam_no, list);
    }

    // Keyed by dashakam_no -- one bucket per dashakam, holding everyone's
    // completion of it within this session.
    const doneByDashakam = new Map<number, number>();
    const mineDashakams = new Set<number>();
    for (const p of progress) {
      doneByDashakam.set(p.dashakam_no, (doneByDashakam.get(p.dashakam_no) ?? 0) + 1);
      if (user && p.user_id === user.id) mineDashakams.add(p.dashakam_no);
    }

    const map = new Map<number, GardenTile>();
    for (const [no, list] of byDashakam) {
      const done = doneByDashakam.get(no) ?? 0;
      const mine = mineDashakams.has(no);
      // Split mode assigns one chanter per row; synchronized expects everyone.
      const expectedPerRow = list.some((r) => r.assigned_user_id) ? 1 : Math.max(confirmedCount, 1);
      const total = list.length * expectedPerRow;
      // Personal sessions have no parayanam_participants rows at all (a group
      // session always has at least the owner), so participants.length === 0
      // means "personal" and the signed-in user may tap freely.
      const canTap =
        !!user &&
        hasStarted &&
        list.some((r) =>
          r.assigned_user_id
            ? r.assigned_user_id === user.id
            : isConfirmedParticipant || participants.length === 0,
        );
      map.set(no, {
        dashakam_no: no,
        scheduleIds: list.map((r) => r.id),
        mineDone: mine ? list.length : 0,
        mineRowIds: mine ? list.map((r) => r.id) : [],
        done,
        total,
        canTap,
        percent: total > 0 ? Math.min(100, (done / total) * 100) : 0,
      });
    }
    return map;
  }, [rows, progress, user, confirmedCount, isConfirmedParticipant, participants.length, startDate]);

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
          (r.assigned_user_id
            ? r.assigned_user_id === user.id
            : isConfirmedParticipant || participants.length === 0),
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
    [tiles, rows, user, isConfirmedParticipant, participants.length, markDashakamComplete, unmarkDashakamComplete, refresh],
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
