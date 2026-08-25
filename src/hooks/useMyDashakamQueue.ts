import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface QueueItem {
  /** parayanam_schedule row id — the unit of completion. */
  scheduleId: string;
  dashakamNo: number;
  scheduledDate: string;
  sourceName: string;
  sessionId: string;
}

export interface QueueRow {
  key: string;
  sourceName: string;
  /** Only set for pending (past-due) rows. */
  scheduledDate?: string;
  items: QueueItem[];
}

function todayIso() {
  // Local calendar date (yyyy-mm-dd)
  return new Date().toLocaleDateString("sv-SE");
}

function groupRows(items: QueueItem[], withDate: boolean): QueueRow[] {
  const map = new Map<string, QueueRow>();
  for (const it of items) {
    const key = withDate ? `${it.sourceName}|${it.scheduledDate}` : it.sourceName;
    let row = map.get(key);
    if (!row) {
      row = {
        key,
        sourceName: it.sourceName,
        scheduledDate: withDate ? it.scheduledDate : undefined,
        items: [],
      };
      map.set(key, row);
    }
    row.items.push(it);
  }
  const rows = Array.from(map.values());
  rows.sort(
    (a, b) => (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? "") || a.sourceName.localeCompare(b.sourceName),
  );
  for (const r of rows) r.items.sort((a, b) => a.dashakamNo - b.dashakamNo);
  return rows;
}

/**
 * Every dashakam assigned to the signed-in user (personal parayanams plus all
 * their groups') that is due today or past due and not yet marked complete.
 * Completion state comes from user_progress, filtered by challenge_session_id
 * and dashakam_no — the same table the garden's "mark as chanted" control
 * now writes to (mirrored alongside parayanam_member_progress).
 */
export function useMyDashakamQueue() {
  const { user } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const today = todayIso();

      // 1. Groups the user is an active member of, plus groups they own.
      const [memberRes, ownedRes] = await Promise.all([
        (supabase as any).from("group_members").select("group_id, left_at").eq("user_id", user.id),
        (supabase as any)
          .from("groups")
          .select("id, group_name")
          .eq("owner_id", user.id)
          .not("status", "in", HIDDEN_GROUP_STATUSES_FILTER),
      ]);
      const memberGroupIds = ((memberRes.data ?? []) as { group_id: string; left_at: string | null }[])
        .filter((r) => !r.left_at)
        .map((r) => r.group_id);
      const groupNames = new Map<string, string>(
        ((ownedRes.data ?? []) as { id: string; group_name: string }[]).map((g) => [g.id, g.group_name]),
      );
      const missing = memberGroupIds.filter((id) => !groupNames.has(id));
      if (missing.length) {
        const { data } = await (supabase as any)
          .from("groups")
          .select("id, group_name")
          .in("id", missing)
          .neq("status", "dissolved");
        for (const g of (data ?? []) as { id: string; group_name: string }[]) {
          groupNames.set(g.id, g.group_name);
        }
      }
      const groupIds = Array.from(groupNames.keys());

      // 2. Running sessions: personal (mine) + every group's.
      const sessionQueries: Promise<any>[] = [
        (supabase as any)
          .from("challenge_sessions")
          .select("id, group_id, user_id")
          .eq("user_id", user.id)
          .is("completed_at", null),
      ];
      if (groupIds.length) {
        sessionQueries.push(
          (supabase as any)
            .from("challenge_sessions")
            .select("id, group_id, user_id")
            .in("group_id", groupIds)
            .is("completed_at", null),
        );
      }
      const sessionRes = await Promise.all(sessionQueries);
      const sessions = new Map<string, { id: string; group_id: string | null; user_id: string }>();
      for (const res of sessionRes) {
        for (const s of (res.data ?? []) as any[]) sessions.set(s.id, s);
      }
      const sessionIds = Array.from(sessions.keys());
      if (!sessionIds.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 3. Which group parayanams the user is confirmed in.
      const { data: partData } = await (supabase as any)
        .from("parayanam_participants")
        .select("challenge_session_id, status")
        .eq("user_id", user.id)
        .in("challenge_session_id", sessionIds);
      const confirmed = new Set(
        ((partData ?? []) as any[]).filter((p) => p.status === "confirmed").map((p) => p.challenge_session_id),
      );

      // 4. Schedule rows due today or earlier.
      const { data: schedData } = await (supabase as any)
        .from("parayanam_schedule")
        .select("id, challenge_session_id, dashakam_no, scheduled_date, assigned_user_id")
        .in("challenge_session_id", sessionIds)
        .lte("scheduled_date", today);
      const sched = (schedData ?? []) as {
        id: string;
        challenge_session_id: string;
        dashakam_no: number;
        scheduled_date: string;
        assigned_user_id: string | null;
      }[];

      const mine = sched.filter((r) => {
        const s = sessions.get(r.challenge_session_id);
        if (!s) return false;
        if (r.assigned_user_id) return r.assigned_user_id === user.id;
        // Synchronized rows: everyone taking part chants them.
        if (!s.group_id) return s.user_id === user.id;
        return confirmed.has(s.id) || s.user_id === user.id;
      });
      if (!mine.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      // 5. Drop the ones already marked complete by this user. Keyed by
      // (challenge_session_id, dashakam_no) since that's what user_progress
      // records per completion, not schedule_id.
      const { data: progData } = await (supabase as any)
        .from("user_progress")
        .select("challenge_session_id, dashakam_no")
        .eq("user_id", user.id)
        .in("challenge_session_id", sessionIds);
      const done = new Set(((progData ?? []) as any[]).map((p) => `${p.challenge_session_id}::${p.dashakam_no}`));

      setItems(
        mine
          .filter((r) => !done.has(`${r.challenge_session_id}::${r.dashakam_no}`))
          .map((r) => {
            const s = sessions.get(r.challenge_session_id)!;
            return {
              scheduleId: r.id,
              dashakamNo: r.dashakam_no,
              scheduledDate: r.scheduled_date,
              sessionId: s.id,
              sourceName: s.group_id ? (groupNames.get(s.group_id) ?? "Group") : "Personal",
            };
          }),
      );
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const removeItem = useCallback((scheduleId: string) => {
    setItems((prev) => prev.filter((i) => i.scheduleId !== scheduleId));
  }, []);

  const today = todayIso();
  const todayRows = groupRows(
    items.filter((i) => i.scheduledDate === today),
    false,
  );
  const pendingItems = items.filter((i) => i.scheduledDate < today);
  const pendingRows = groupRows(pendingItems, true);

  return {
    loading,
    todayRows,
    pendingRows,
    pendingCount: pendingItems.length,
    removeItem,
    refresh: load,
  };
}
