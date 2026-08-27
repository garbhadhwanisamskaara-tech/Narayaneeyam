import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleRow {
  id: string;
  challenge_session_id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
  is_manual_override: boolean;
}

/**
 * SAME_FOR_ALL — everyone reads the same block on a given parayanam day.
 * RELAY        — the whole set is completed collectively each parayanam day,
 *                split into contiguous blocks that rotate among members.
 * REPEAT_SAME  — everyone reads the entire set on every parayanam day.
 */
export type DistributionMode = "SAME_FOR_ALL" | "RELAY" | "REPEAT_SAME";

/** Legacy rows have no distribution_mode; fall back to challenge_type. */
export function deriveDistributionMode(
  distributionMode: string | null | undefined,
  challengeType: string | null | undefined,
): DistributionMode {
  if (distributionMode === "RELAY" || distributionMode === "REPEAT_SAME" || distributionMode === "SAME_FOR_ALL")
    return distributionMode;
  return challengeType === "group_relay" ? "RELAY" : "SAME_FOR_ALL";
}

const ROW_COLS = "id, challenge_session_id, dashakam_no, scheduled_date, assigned_user_id, is_manual_override";

/** Calendar span in days — for display only, never for allocation. */
export function daysBetween(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/**
 * Cut `dashakams` into `n` reasonably balanced contiguous blocks — the first
 * `remainder` blocks get one extra. Mirrors the server-side allocation.
 */
export function contiguousBlocks(dashakams: number[], n: number): number[][] {
  if (n <= 0) return [];
  const base = Math.floor(dashakams.length / n);
  const remainder = dashakams.length % n;
  const blocks: number[][] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    const size = base + (i < remainder ? 1 : 0);
    blocks.push(dashakams.slice(cursor, cursor + size));
    cursor += size;
  }
  return blocks;
}

/**
 * Build the allocation over the ACTUAL parayanam days (not every calendar day).
 * `dates` comes from parayanamDates() in src/lib/parayanamDays.ts.
 */
export function buildSchedule(
  dashakams: number[],
  dates: string[],
  mode: DistributionMode,
  memberIds: string[],
  sameForAllPerDay = 1,
  scheduleOverrides: Record<string, number[]> = {},
): Omit<ScheduleRow, "id" | "challenge_session_id">[] {
  if (!dashakams.length || !dates.length) return [];

  if (mode === "RELAY") {
    const n = memberIds.length;
    const out: Omit<ScheduleRow, "id" | "challenge_session_id">[] = [];

    dates.forEach((scheduled_date, dayIndex) => {
      if (!n) {
        // No confirmed members yet — preview the selected set only.
        dashakams.forEach((dashakam_no) =>
          out.push({
            dashakam_no,
            scheduled_date,
            assigned_user_id: null,
            is_manual_override: false,
          }),
        );
        return;
      }

      // CASE 1:
      // Members <= dashakams
      // Keep the existing balanced contiguous-block Relay logic.
      if (n <= dashakams.length) {
        contiguousBlocks(dashakams, n).forEach((block, blockIndex) => {
          const owner = memberIds[(blockIndex + dayIndex) % n];

          block.forEach((dashakam_no) =>
            out.push({
              dashakam_no,
              scheduled_date,
              assigned_user_id: owner,
              is_manual_override: false,
            }),
          );
        });

        return;
      }

      // CASE 2:
      // Members > dashakams
      // Every member gets one dashakam.
      // Dashakams repeat round-robin, and the starting dashakam
      // shifts each parayanam day so the same people do not keep
      // receiving the same dashakam.
      memberIds.forEach((memberId, memberIndex) => {
        const dashakamIndex = (memberIndex + dayIndex) % dashakams.length;

        out.push({
          dashakam_no: dashakams[dashakamIndex],
          scheduled_date,
          assigned_user_id: memberId,
          is_manual_override: false,
        });
      });
    });

    return out;
  }

  if (mode === "REPEAT_SAME") {
    return dates.flatMap((scheduled_date) =>
      dashakams.map((dashakam_no) => ({
        dashakam_no,
        scheduled_date,
        assigned_user_id: null,
        is_manual_override: false,
      })),
    );
  }

  // SAME_FOR_ALL
  //
  // Everyone reads the same dashakams on a given day.
  // The selected list cycles continuously for the full duration.
  //
  // Example: [18,60,78,79], 2 per day
  // Day 1 -> 18,60
  // Day 2 -> 78,79
  // Day 3 -> 18,60
  //
  // A Guru can override an individual day's list.
  const out: Omit<ScheduleRow, "id" | "challenge_session_id">[] = [];

  const perDay = Math.max(1, sameForAllPerDay);

  dates.forEach((scheduled_date, dayIndex) => {
    const override = scheduleOverrides[scheduled_date];

    if (override?.length) {
      override.forEach((dashakam_no) => {
        out.push({
          dashakam_no,
          scheduled_date,
          assigned_user_id: null,
          is_manual_override: true,
        });
      });

      return;
    }

    for (let j = 0; j < perDay; j += 1) {
      const dashakamIndex = (dayIndex * perDay + j) % dashakams.length;

      out.push({
        dashakam_no: dashakams[dashakamIndex],
        scheduled_date,
        assigned_user_id: null,
        is_manual_override: false,
      });
    }
  });

  return out;
}

export function useParayanamSchedule(sessionId: string | null | undefined) {
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await (supabase as any)
      .from("parayanam_schedule")
      .select(ROW_COLS)
      .eq("challenge_session_id", sessionId)
      .order("scheduled_date", { ascending: true })
      .order("dashakam_no", { ascending: true });
    if (err) setError(err.message);
    else {
      setError(null);
      setRows((data ?? []) as ScheduleRow[]);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Replace the whole schedule for a session. */
  const generate = useCallback(
    async (
      targetSessionId: string,
      dashakams: number[],
      dates: string[],
      mode: DistributionMode,
      memberIds: string[],
      sameForAllPerDay = 1,
      scheduleOverrides: Record<string, number[]> = {},
    ) => {
      const planned = buildSchedule(dashakams, dates, mode, memberIds, sameForAllPerDay, scheduleOverrides);
      await (supabase as any).from("parayanam_schedule").delete().eq("challenge_session_id", targetSessionId);
      const { error: err } = await (supabase as any)
        .from("parayanam_schedule")
        .insert(planned.map((p) => ({ ...p, challenge_session_id: targetSessionId })));
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  /** Owner hand-edits a single slot. */
  const updateRow = useCallback(
    async (rowId: string, patch: { assigned_user_id?: string | null; scheduled_date?: string }) => {
      const { error: err } = await (supabase as any)
        .from("parayanam_schedule")
        .update({ ...patch, is_manual_override: true, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (err) throw new Error(err.message);
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, ...patch, is_manual_override: true } : r)));
    },
    [],
  );

  return { rows, loading, error, refresh, generate, updateRow };
}
