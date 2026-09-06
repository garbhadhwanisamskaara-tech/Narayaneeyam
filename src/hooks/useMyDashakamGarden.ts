import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { useSessionParticipants } from "@/hooks/useParayanamParticipants";
import { isParticipantEligible } from "@/lib/parayanamEligibility";
import type { GardenOccurrence, GardenTile } from "@/hooks/useSessionGarden";

interface ScheduleRow {
  id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
}

/**
 * Personal version of the parayanam garden. One tile per scheduled
 * occurrence; bloom is binary and entirely personal.
 */
export function useMyDashakamGarden(sessionId: string | null | undefined) {
  const { user } = useAuth();
  const { participants } = useSessionParticipants(sessionId ?? undefined);
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [mineRowIds, setMineRowIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

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
      setMineRowIds([]);
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
    const ids = scheduleRows.map((r) => r.id);
    if (user && ids.length) {
      const { data: prog } = await (supabase as any)
        .from("parayanam_member_progress")
        .select("schedule_id")
        .eq("user_id", user.id)
        .in("schedule_id", ids);
      setMineRowIds(((prog ?? []) as { schedule_id: string }[]).map((p) => p.schedule_id));
    } else {
      setMineRowIds([]);
    }
    setLoading(false);
  }, [sessionId, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const tiles = useMemo(() => {
    const mineSet = new Set(mineRowIds);
    const map = new Map<string, GardenTile>();
    for (const r of rows) {
      const mine = mineSet.has(r.id);
      const canTap =
        !!user &&
        isConfirmedParticipant &&
        (r.assigned_user_id ? r.assigned_user_id === user.id : true);
      map.set(r.id, {
        dashakam_no: r.dashakam_no,
        scheduleIds: [r.id],
        mineDone: mine ? 1 : 0,
        mineRowIds: mine ? [r.id] : [],
        done: mine ? 1 : 0,
        total: 1,
        canTap,
        percent: mine ? 100 : 0,
        scheduled_date: r.scheduled_date ?? null,
      });
    }
    return map;
  }, [rows, mineRowIds, user, isConfirmedParticipant]);

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
    loading,
    pending,
    refresh,
    toggleDashakam,
    hasSchedule: rows.length > 0,
  };
}
