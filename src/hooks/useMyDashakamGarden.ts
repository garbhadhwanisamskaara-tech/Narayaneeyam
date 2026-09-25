import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { toast } from "@/hooks/use-toast";
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
  const { markDashakamComplete, unmarkDashakamComplete } = useCompleteDashakam();

  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [mineRowIds, setMineRowIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);

  // Own-row eligibility (never the capped full participant list).
  const [isConfirmedParticipant, setIsConfirmedParticipant] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setMineRowIds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sess }, ownRes] = await Promise.all([
      (supabase as any)
        .from("challenge_sessions")
        .select("participation_type, start_date")
        .eq("id", sessionId)
        .maybeSingle(),
      user
        ? (supabase as any)
            .from("parayanam_participants")
            .select("status, contribution_status, access_status")
            .eq("challenge_session_id", sessionId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setStartDate((sess as any)?.start_date ?? null);
    setIsConfirmedParticipant(
      isParticipantEligible(ownRes?.data ?? null, (sess as any)?.participation_type ?? null),
    );
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
    // Same start-date gate as useSessionGarden.
    const today = new Date().toLocaleDateString("sv-SE");
    const hasStarted = !startDate || today >= startDate;
    const mineSet = new Set(mineRowIds);
    const map = new Map<string, GardenTile>();
    for (const r of rows) {
      const mine = mineSet.has(r.id);
      const canTap =
        !!user &&
        hasStarted &&
        isConfirmedParticipant &&
        (r.assigned_user_id ? r.assigned_user_id === user.id : true);
      const disabledReason = canTap
        ? null
        : !hasStarted
          ? "This parayanam hasn't started yet"
          : !isConfirmedParticipant
            ? "Only confirmed participants can mark this dashakam"
            : "This dashakam is assigned to another member";
      map.set(r.id, {
        dashakam_no: r.dashakam_no,
        scheduleIds: [r.id],
        mineDone: mine ? 1 : 0,
        mineRowIds: mine ? [r.id] : [],
        done: mine ? 1 : 0,
        total: 1,
        canTap,
        disabledReason,
        percent: mine ? 100 : 0,
        scheduled_date: r.scheduled_date ?? null,
      });
    }
    return map;
  }, [rows, mineRowIds, user, isConfirmedParticipant, startDate]);

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
      const ok =
        tile.mineDone > 0
          ? await unmarkDashakamComplete(occurrenceKey)
          : await markDashakamComplete(occurrenceKey);
      setPending(null);
      if (!ok) {
        toast({
          variant: "destructive",
          title:
            tile.mineDone > 0
              ? "Could not update this dashakam. Please try again."
              : "Could not mark this dashakam complete. Please try again.",
        });
      }
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
