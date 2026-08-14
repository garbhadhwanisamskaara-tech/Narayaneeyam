import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleViewRow {
  scheduled_date: string;
  dashakam_no: number;
  assigned_names: string | null;
}

export interface MyScheduleRow {
  scheduled_date: string;
  dashakam_no: number;
  completed: boolean;
}

function byDate<T extends { scheduled_date: string; dashakam_no: number }>(rows: T[]) {
  return [...rows].sort(
    (a, b) =>
      a.scheduled_date.localeCompare(b.scheduled_date) || a.dashakam_no - b.dashakam_no
  );
}

function useRpcSchedule<T extends { scheduled_date: string; dashakam_no: number }>(
  fn: string,
  sessionId: string | null | undefined
) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await (supabase as any).rpc(fn, { p_session_id: sessionId });
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setError(null);
      setRows(byDate((data ?? []) as T[]));
    }
    setLoading(false);
  }, [fn, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}

/** Full parayanam schedule — date, dashakam and who's chanting it. Visible to any group member. */
export function useParayanamScheduleView(sessionId: string | null | undefined) {
  return useRpcSchedule<ScheduleViewRow>("get_parayanam_schedule_view", sessionId);
}

/** The signed-in user's own dashakams for a parayanam, with completion status. */
export function useMyParayanamSchedule(sessionId: string | null | undefined) {
  return useRpcSchedule<MyScheduleRow>("get_my_parayanam_schedule", sessionId);
}

export function formatScheduleDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
