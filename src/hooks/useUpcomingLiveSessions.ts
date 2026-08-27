import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { HIDDEN_SESSION_STATES_FILTER } from "@/lib/parayanamFilters";
export interface UpcomingLiveSession {
  liveSessionId: string;
  challengeSessionId: string;
  parayanamName: string;
  parayanamStartDate: string | null;
  parayanamEndDate: string | null;
  groupName: string;
  groupId: string | null;
  sessionDate: string;
  startDatetime: string;
  endDatetime: string;
  joinBeforeMins: number;
  dashakams: number[];
}

function todayIso() {
  return new Date().toLocaleDateString("sv-SE");
}

/**
 * Live sessions (today onwards) for parayanams where the member is confirmed
 * and their access is active. Schedule metadata comes from the
 * `live_sessions_public` view, which deliberately has no meeting_url.
 */
export function useUpcomingLiveSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<UpcomingLiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSessions([]);
      setLoading(false);
      return;
    }
    try {
      // 1. Parayanams the member is confirmed + active in.
      const { data: partData } = await (supabase as any)
        .from("parayanam_participants")
        .select("challenge_session_id, status, access_status")
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .eq("access_status", "active");
      const sessionIds = Array.from(
        new Set(((partData ?? []) as any[]).map((p) => p.challenge_session_id).filter(Boolean)),
      ) as string[];
      if (!sessionIds.length) {
        setSessions([]);
        setLoading(false);
        return;
      }

      // 2. Live parayanams among them.
      const { data: csData } = await (supabase as any)
        .from("challenge_sessions")
        .select("id, parayanam_name, group_id, start_date, end_date, delivery_mode, technical_state")
        .in("id", sessionIds)
        .eq("delivery_mode", "LIVE")
        .is("completed_at", null)
        .not("technical_state", "in", HIDDEN_SESSION_STATES_FILTER);
      const parayanams = new Map<
        string,
        {
          name: string;
          groupId: string | null;
          startDate: string | null;
          endDate: string | null;
        }
      >(
        ((csData ?? []) as any[]).map((c) => [
          c.id,
          {
            name: c.parayanam_name || "Parayanam",
            groupId: c.group_id ?? null,
            startDate: c.start_date ?? null,
            endDate: c.end_date ?? null,
          },
        ]),
      );
      const liveIds = Array.from(parayanams.keys());
      if (!liveIds.length) {
        setSessions([]);
        setLoading(false);
        return;
      }

      const today = todayIso();
      const groupIds = Array.from(
        new Set(
          Array.from(parayanams.values())
            .map((p) => p.groupId)
            .filter(Boolean),
        ),
      ) as string[];

      const [liveRes, groupRes, schedRes] = await Promise.all([
        (supabase as any)
          .from("live_sessions_public")
          .select("id, challenge_session_id, session_date, start_datetime, end_datetime, join_before_mins")
          .in("challenge_session_id", liveIds)
          .gte("session_date", today)
          .order("start_datetime", { ascending: true }),
        groupIds.length
          ? (supabase as any).from("groups").select("id, group_name").in("id", groupIds)
          : Promise.resolve({ data: [] }),
        (supabase as any)
          .from("parayanam_schedule")
          .select("challenge_session_id, dashakam_no, scheduled_date, assigned_user_id")
          .in("challenge_session_id", liveIds)
          .gte("scheduled_date", today),
      ]);

      const groupNames = new Map<string, string>(((groupRes.data ?? []) as any[]).map((g) => [g.id, g.group_name]));
      const sched = (schedRes.data ?? []) as {
        challenge_session_id: string;
        dashakam_no: number;
        scheduled_date: string;
        assigned_user_id: string | null;
      }[];

      const rows: UpcomingLiveSession[] = ((liveRes.data ?? []) as any[]).map((ls) => {
        const p = parayanams.get(ls.challenge_session_id);
        const dashakams = sched
          .filter(
            (s) =>
              s.challenge_session_id === ls.challenge_session_id &&
              s.scheduled_date === ls.session_date &&
              (!s.assigned_user_id || s.assigned_user_id === user.id),
          )
          .map((s) => s.dashakam_no)
          .sort((a, b) => a - b);
        return {
          liveSessionId: ls.id,
          challengeSessionId: ls.challenge_session_id,
          parayanamName: p?.name ?? "Parayanam",
          parayanamStartDate: p?.startDate ?? null,
          parayanamEndDate: p?.endDate ?? null,
          groupName: (p?.groupId && groupNames.get(p.groupId)) || "Personal",
          groupId: p?.groupId ?? null,
          sessionDate: ls.session_date,
          startDatetime: ls.start_datetime,
          endDatetime: ls.end_datetime,
          joinBeforeMins: ls.join_before_mins ?? 10,
          dashakams: Array.from(new Set(dashakams)),
        };
      });

      // Drop sessions that already finished.
      // Drop sessions that already finished.
      const now = Date.now();

      const futureSessions = rows
        .filter((r) => new Date(r.endDatetime).getTime() > now)
        .sort((a, b) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

      // Keep only the NEXT upcoming live session
      // for each Parayanam.
      const nextByParayanam = new Map<string, UpcomingLiveSession>();

      for (const session of futureSessions) {
        if (!nextByParayanam.has(session.challengeSessionId)) {
          nextByParayanam.set(session.challengeSessionId, session);
        }
      }

      setSessions(Array.from(nextByParayanam.values()));
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
    // Refetch every 60s so newly added or edited sessions appear.
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  return { sessions, loading, refresh: load };
}
