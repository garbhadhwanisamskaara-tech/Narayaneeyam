import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CompletedDashakam {
  dashakam_no: number;
  /** ISO timestamp of the completion, when the row carries one. */
  completed_at: string | null;
}

export interface ReportStats {
  completedList: CompletedDashakam[];
  notCompletedList: number[];
  completed: number;
  notCompleted: number;
  /** Dashakams that reached full bloom (same rule as the group garden). */
  blooms: number;
}

export interface MemberReport {
  user_id: string;
  display_name: string;
  stats: ReportStats;
}

export interface ParayanamReport {
  session_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  /** The signed-in user's own numbers (null when they did not take part). */
  mine: ReportStats | null;
  /** Everyone's numbers — only populated for groups the user owns. */
  members: MemberReport[];
  /** Group-wide totals for the parayanam. */
  aggregate: ReportStats;
}

export interface GroupReport {
  group_id: string;
  group_name: string;
  isOwner: boolean;
  parayanams: ParayanamReport[];
}

interface ScheduleRow {
  id: string;
  dashakam_no: number;
  assigned_user_id: string | null;
}

interface ProgressRow {
  schedule_id: string;
  user_id: string;
  completed_at: string | null;
}

function emptyStats(): ReportStats {
  return { completedList: [], notCompletedList: [], completed: 0, notCompleted: 0, blooms: 0 };
}

/**
 * Read-only "My Parayanams" report: every group the user belongs to, each of
 * its parayanams, and the completed / not-completed / bloom counts derived from
 * parayanam_schedule and user_progress.
 *
 * Completions are read from user_progress (keyed by challenge_session_id +
 * dashakam_no), not parayanam_member_progress -- both tables are written on
 * every completion, but user_progress is the single source of truth going
 * forward. Confirmed safe: no session has ever assigned the same user more
 * than one schedule row for the same dashakam number, so collapsing from
 * schedule_id to (session, dashakam_no) loses nothing.
 */
export function useParayanamReport(groupIdFilter?: string) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Groups the user is in (member rows) plus those they own.
      const [memberRes, ownedRes] = await Promise.all([
        (supabase as any).from("group_members").select("group_id").eq("user_id", user.id),
        (supabase as any)
          .from("groups")
          .select("id, group_name, owner_id")
          .eq("owner_id", user.id)
          .neq("status", "dissolved"),
      ]);

      const ids = new Set<string>(((memberRes.data ?? []) as { group_id: string }[]).map((r) => r.group_id));
      for (const g of (ownedRes.data ?? []) as any[]) ids.add(g.id);
      let groupIds = Array.from(ids);
      if (groupIdFilter) groupIds = groupIds.filter((id) => id === groupIdFilter);
      if (!groupIds.length) {
        setGroups([]);
        setError(null);
        setLoading(false);
        return;
      }

      const { data: groupRows } = await (supabase as any)
        .from("groups")
        .select("id, group_name, owner_id")
        .in("id", groupIds)
        .neq("status", "dissolved");
      const groupList = (groupRows ?? []) as { id: string; group_name: string; owner_id: string }[];
      const liveGroupIds = groupList.map((g) => g.id);
      if (!liveGroupIds.length) {
        setGroups([]);
        setError(null);
        setLoading(false);
        return;
      }

      // 2. Every parayanam of those groups.
      const { data: sessionRows } = await (supabase as any)
        .from("challenge_sessions")
        .select("id, group_id, parayanam_name, start_date, end_date")
        .in("group_id", liveGroupIds);
      const sessions = (sessionRows ?? []) as {
        id: string;
        group_id: string;
        parayanam_name: string | null;
        start_date: string | null;
        end_date: string | null;
      }[];
      const sessionIds = sessions.map((s) => s.id);

      // 3. Schedule, participants and completions for all of them at once.
      const [schedRes, partRes] = await Promise.all([
        sessionIds.length
          ? (supabase as any)
              .from("parayanam_schedule")
              .select("id, challenge_session_id, dashakam_no, assigned_user_id")
              .in("challenge_session_id", sessionIds)
          : Promise.resolve({ data: [] }),
        sessionIds.length
          ? (supabase as any)
              .from("parayanam_participants")
              .select("challenge_session_id, user_id, status")
              .in("challenge_session_id", sessionIds)
          : Promise.resolve({ data: [] }),
      ]);

      const schedule = (schedRes.data ?? []) as (ScheduleRow & { challenge_session_id: string })[];
      const participants = (partRes.data ?? []) as {
        challenge_session_id: string;
        user_id: string;
        status: string;
      }[];

      // Completions come from parayanam_member_progress, which records one
      // row per (schedule row, user) -- so each scheduled occurrence of a
      // dashakam is judged independently.
      let progress: ProgressRow[] = [];
      const scheduleIds = schedule.map((r) => r.id);
      // Chunked so long-running groups do not overflow the URL length.
      for (let i = 0; i < scheduleIds.length; i += 500) {
        const chunk = scheduleIds.slice(i, i + 500);
        const { data } = await (supabase as any)
          .from("parayanam_member_progress")
          .select("schedule_id, user_id, completed_at")
          .in("schedule_id", chunk);
        progress = progress.concat((data ?? []) as ProgressRow[]);
      }

      // 4. Display names for everyone involved.
      const userIds = Array.from(new Set(participants.map((p) => p.user_id)));
      let nameById = new Map<string, string>();
      if (userIds.length) {
        const { data: profs } = await (supabase as any)
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        nameById = new Map(((profs ?? []) as any[]).map((p) => [p.id, p.display_name ?? p.email ?? "Member"]));
      }

      // 5. Fold everything into the report shape.
      const scheduleBySession = new Map<string, ScheduleRow[]>();
      for (const r of schedule) {
        const list = scheduleBySession.get(r.challenge_session_id) ?? [];
        list.push({ id: r.id, dashakam_no: r.dashakam_no, assigned_user_id: r.assigned_user_id });
        scheduleBySession.set(r.challenge_session_id, list);
      }
      // Keyed by schedule row id -- one bucket per scheduled occurrence,
      // holding every user's completion of it.
      const progressByRow = new Map<string, ProgressRow[]>();
      for (const p of progress) {
        const list = progressByRow.get(p.schedule_id) ?? [];
        list.push(p);
        progressByRow.set(p.schedule_id, list);
      }

      const report: GroupReport[] = groupList
        .map((g) => {
          const isOwner = g.owner_id === user.id;
          const groupSessions = sessions.filter((s) => s.group_id === g.id);

          const parayanams: ParayanamReport[] = groupSessions.map((s) => {
            const rows = scheduleBySession.get(s.id) ?? [];
            const confirmed = participants
              .filter((p) => p.challenge_session_id === s.id && p.status === "confirmed")
              .map((p) => p.user_id);
            const splitMode = rows.some((r) => r.assigned_user_id);
            const expectedPerRow = splitMode ? 1 : Math.max(confirmed.length, 1);
            const progressFor = (scheduleId: string) => progressByRow.get(scheduleId) ?? [];

            // Bloom state per scheduled occurrence (same rule as the garden).
            const fullyBloomed = new Set<string>();
            for (const r of rows) {
              const done = progressFor(r.id).length;
              const total = r.assigned_user_id ? 1 : expectedPerRow;
              if (total > 0 && done >= total) fullyBloomed.add(r.id);
            }

            const statsFor = (uid: string): ReportStats => {
              const eligible = rows.filter((r) => (r.assigned_user_id ? r.assigned_user_id === uid : true));
              const completedList: CompletedDashakam[] = [];
              const notCompletedList: number[] = [];
              for (const r of eligible) {
                const mine = progressFor(r.id).find((p) => p.user_id === uid);
                if (mine) {
                  completedList.push({
                    dashakam_no: r.dashakam_no,
                    completed_at: mine.completed_at ?? null,
                  });
                } else {
                  notCompletedList.push(r.dashakam_no);
                }
              }
              completedList.sort((a, b) => a.dashakam_no - b.dashakam_no);
              notCompletedList.sort((a, b) => a - b);
              const blooms = eligible.filter((r) => fullyBloomed.has(r.id)).length;
              return {
                completedList,
                notCompletedList,
                completed: completedList.length,
                notCompleted: notCompletedList.length,
                blooms,
              };
            };

            // Group-wide totals: every expected completion across all members.
            const aggregate: ReportStats = (() => {
              const completedList: CompletedDashakam[] = [];
              const notCompletedList: number[] = [];
              for (const r of rows) {
                const done = progressFor(r.id);
                for (const d of done) {
                  completedList.push({ dashakam_no: r.dashakam_no, completed_at: d.completed_at });
                }
                const expected = r.assigned_user_id ? 1 : Math.max(confirmed.length, 1);
                for (let i = done.length; i < expected; i++) notCompletedList.push(r.dashakam_no);
              }
              completedList.sort((a, b) => a.dashakam_no - b.dashakam_no);
              notCompletedList.sort((a, b) => a - b);
              return {
                completedList,
                notCompletedList,
                completed: completedList.length,
                notCompleted: notCompletedList.length,
                blooms: fullyBloomed.size,
              };
            })();

            const iTookPart = confirmed.includes(user.id);

            return {
              session_id: s.id,
              name: s.parayanam_name || "Parayanam",
              start_date: s.start_date,
              end_date: s.end_date,
              mine: iTookPart ? statsFor(user.id) : null,
              members: isOwner
                ? confirmed
                    .map((uid) => ({
                      user_id: uid,
                      display_name: nameById.get(uid) ?? "Member",
                      stats: statsFor(uid),
                    }))
                    .sort((a, b) =>
                      a.display_name.localeCompare(b.display_name, undefined, {
                        sensitivity: "base",
                      }),
                    )
                : [],
              aggregate,
            };
          });

          parayanams.sort((a, b) => ((a.start_date ?? "") < (b.start_date ?? "") ? 1 : -1));

          return { group_id: g.id, group_name: g.group_name, isOwner, parayanams };
        })
        .filter((g) => g.parayanams.length > 0 || !!groupIdFilter);

      setGroups(report);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Could not load your parayanam report.");
      setGroups([]);
    }
    setLoading(false);
  }, [user, groupIdFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, loading, error, refresh: load, emptyStats };
}
