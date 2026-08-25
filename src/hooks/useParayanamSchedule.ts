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

export type DistributionMode = "synchronized" | "split";

const ROW_COLS =
  "id, challenge_session_id, dashakam_no, scheduled_date, assigned_user_id, is_manual_override";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string) {
  const a = new Date(`${start}T00:00:00Z`).getTime();
  const b = new Date(`${end}T00:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

/**
 * Spread `dashakams` over the date range, then assign owners.
 * Synchronized → assigned_user_id = null (everyone chants the same dashakam).
 * Split (relay) → single day (startDate only); dashakams are cut into contiguous
 *                 blocks, one per member, evenly (first `remainder` members get one extra).
 *                 Mirrors the server-side finalize_parayanam() allocation.
 */
export function buildSchedule(
  dashakams: number[],
  startDate: string,
  endDate: string,
  mode: DistributionMode,
  memberIds: string[]
): Omit<ScheduleRow, "id" | "challenge_session_id">[] {
  if (mode === "split") {
    const n = memberIds.length;
    const base = n ? Math.floor(dashakams.length / n) : 0;
    const remainder = n ? dashakams.length % n : 0;
    const owners: (string | null)[] = [];
    memberIds.forEach((id, idx) => {
      const count = base + (idx < remainder ? 1 : 0);
      for (let k = 0; k < count; k++) owners.push(id);
    });
    return dashakams.map((dashakam_no, i) => ({
      dashakam_no,
      scheduled_date: startDate,
      assigned_user_id: owners[i] ?? null,
      is_manual_override: false,
    }));
  }

  const totalDays = daysBetween(startDate, endDate);
  const perDay = Math.ceil(dashakams.length / totalDays);
  const start = new Date(`${startDate}T00:00:00Z`);

  return dashakams.map((dashakam_no, i) => {
    const dayOffset = Math.min(totalDays - 1, Math.floor(i / perDay));
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return {
      dashakam_no,
      scheduled_date: isoDate(date),
      assigned_user_id: null,
      is_manual_override: false,
    };
  });
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
      startDate: string,
      endDate: string,
      mode: DistributionMode,
      memberIds: string[]
    ) => {
      const planned = buildSchedule(dashakams, startDate, endDate, mode, memberIds);
      await (supabase as any)
        .from("parayanam_schedule")
        .delete()
        .eq("challenge_session_id", targetSessionId);
      const { error: err } = await (supabase as any)
        .from("parayanam_schedule")
        .insert(planned.map((p) => ({ ...p, challenge_session_id: targetSessionId })));
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  /** Owner hand-edits a single slot. */
  const updateRow = useCallback(
    async (rowId: string, patch: { assigned_user_id?: string | null; scheduled_date?: string }) => {
      const { error: err } = await (supabase as any)
        .from("parayanam_schedule")
        .update({ ...patch, is_manual_override: true, updated_at: new Date().toISOString() })
        .eq("id", rowId);
      if (err) throw new Error(err.message);
      setRows((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, ...patch, is_manual_override: true } : r))
      );
    },
    []
  );

  return { rows, loading, error, refresh, generate, updateRow };
}
