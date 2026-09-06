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
  /** The schedule row this tile represents. */
  scheduleIds: string[];
  /** 1 when the current user has completed this exact occurrence. */
  mineDone: number;
  /** Schedule row ids the current user has completed (0 or 1 entry). */
  mineRowIds: string[];
  /** Completions recorded by anyone for this occurrence. */
  done: number;
  /** Expected completions once everyone confirmed has chanted it. */
  total: number;
  canTap: boolean;
  /** 0–100 bloom intensity. */
  percent: number;
  /** Scheduled date for this occurrence, if any. */
  scheduled_date: string | null;
}

export interface GardenOccurrence {
  /** Schedule row id — the unit of completion. */
  key: string;
  dashakamNo: number;
  scheduledDate: string;
}

/**
 * Single source of truth for a parayanam's garden. Completion is tracked per
 * exact scheduled occurrence (parayanam_member_progress.schedule_id), so a
 * dashakam repeated on several days shows as several separate buds.
 */
export function useSessionGarden(sessionId: string | null | undefined) {
  const { user } = useAuth();
  const { participants } = useSessionParticipants(sessionId ?? undefined);
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [progress, setProgress] = useState<{ schedule_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
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
    // The parayanam only becomes tappable on/after its start_date. A missing
    // start_date counts as already started.
    const today = new Date().toLocaleDateString("sv-SE");
    const hasStarted = !startDate || today >= startDate;

    const doneByRow = new Map<string, number>();
    const mineRows = new Set<string>();
    for (const p of progress) {
      doneByRow.set(p.schedule_id, (doneByRow.get(p.schedule_id) ?? 0) + 1);
      if (user && p.user_id === user.id) mineRows.add(p.schedule_id);
    }

    const map = new Map<string, GardenTile>();
    for (const r of rows) {
      const done = doneByRow.get(r.id) ?? 0;
      const mine = mineRows.has(r.id);
      // Split mode assigns one chanter per row; synchronized expects everyone.
      const total = r.assigned_user_id ? 1 : Math.max(confirmedCount, 1);
      // Personal sessions have no parayanam_participants rows at all, so
      // participants.length === 0 means "personal".
      const canTap =
        !!user &&
        hasStarted &&
        (r.assigned_user_id
          ? r.assigned_user_id === user.id
          : isConfirmedParticipant || participants.length === 0);
      map.set(r.id, {
        dashakam_no: r.dashakam_no,
        scheduleIds: [r.id],
        mineDone: mine ? 1 : 0,
        mineRowIds: mine ? [r.id] : [],
        done,
        total,
        canTap,
        percent: total > 0 ? Math.min(100, (done / total) * 100) : 0,
        scheduled_date: r.scheduled_date ?? null,
      });
    }
    return map;
  }, [rows, progress, user, confirmedCount, isConfirmedParticipant, participants.length, startDate]);

  const blooms = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, t] of tiles) m.set(key, t.percent);
    return m;
  }, [tiles]);

  const occurrences = useMemo<GardenOccurrence[]>(
    () => rows.map((r) => ({ key: r.id, dashakamNo: r.dashakam_no, scheduledDate: r.scheduled_date })),
    [rows],
  );

  /** Toggle the current user's completion for one scheduled occurrence. */
  const toggleDashakam = useCallback(
    async (occurrenceKey: string) => {
      const tile = tiles.get(occurrenceKey);
      if (!tile || !tile.canTap || !user) return;
      setPending(occurrenceKey);
      if (tile.mineDone > 0) {
        await unmarkDashakamComplete(occurrenceKey);
      } else {
        await markDashakamComplete(occurrenceKey);
      }
      setPending(null);
      await refresh();
    },
    [tiles, user, markDashakamComplete, unmarkDashakamComplete, refresh],
  );

  return {
    tiles,
    blooms,
    occurrences,
    confirmedCount,
    loading,
    pending,
    refresh,
    toggleDashakam,
    hasSchedule: rows.length > 0,
  };
}
