import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ParticipantStatus = "invited" | "confirmed" | "declined";

export interface Participant {
  id: string;
  challenge_session_id: string;
  user_id: string;
  status: ParticipantStatus;
  invited_at: string | null;
  responded_at: string | null;
}

export interface PendingInvite extends Participant {
  group_id: string | null;
  group_name: string | null;
  start_date: string | null;
  end_date: string | null;
  dashakams_target: number | null;
  parayanam_name: string | null;
  guru_name: string | null;
  delivery_mode: "SELF_PACED" | "LIVE" | null;
  /** First upcoming live session, from live_sessions_public (never a meeting URL). */
  first_session_at?: string | null;
  participation_type: "FREE" | "PAID" | null;
  contribution_amount: number | null;
  payment_url: string | null;
  payment_note: string | null;
}

const COLS = "id, challenge_session_id, user_id, status, invited_at, responded_at";

/**
 * Invites a set of members to a parayanam. The owner (when opted in) is written
 * straight in as confirmed — she does not need to answer her own invite.
 */
export async function inviteParticipants(
  sessionId: string,
  invitedUserIds: string[],
  ownerUserId?: string | null
): Promise<void> {
  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];

  for (const uid of Array.from(new Set(invitedUserIds))) {
    if (ownerUserId && uid === ownerUserId) continue;
    rows.push({ challenge_session_id: sessionId, user_id: uid, status: "invited", invited_at: now });
  }
  if (ownerUserId) {
    rows.push({
      challenge_session_id: sessionId,
      user_id: ownerUserId,
      status: "confirmed",
      invited_at: now,
      responded_at: now,
    });
  }
  if (!rows.length) return;

  // Replace any earlier invites for these people on this parayanam.
  await (supabase as any)
    .from("parayanam_participants")
    .delete()
    .eq("challenge_session_id", sessionId)
    .in("user_id", rows.map((r) => r.user_id as string));

  const { error } = await (supabase as any).from("parayanam_participants").insert(rows);
  if (error) throw new Error(error.message);
}

export type RemovalMode = "distribute" | "assign_to";

/**
 * Revokes one person's participation in a single parayanam (does not touch group
 * membership). Their incomplete Split-mode dashakams are either shared out among
 * the remaining confirmed participants, or handed to one chosen member.
 */
export async function removeParticipant(
  sessionId: string,
  userId: string,
  mode: RemovalMode = "distribute",
  targetUserId?: string | null
): Promise<void> {
  const { error } = await (supabase as any).rpc("remove_participant_from_parayanam", {
    p_session_id: sessionId,
    p_user_id: userId,
    p_mode: mode,
    p_target_user_id: mode === "assign_to" ? targetUserId ?? null : null,
  });
  if (error) throw new Error(error.message);
}

/**
 * How many dashakams in this parayanam are assigned to someone and still
 * unchanted — only meaningful for Split-mode (group_relay) parayanams.
 */
export async function countIncompleteAssignments(
  sessionId: string,
  userId: string
): Promise<{ splitMode: boolean; incomplete: number }> {
  const { data: session } = await (supabase as any)
    .from("challenge_sessions")
    .select("challenge_type")
    .eq("id", sessionId)
    .maybeSingle();
  const splitMode = session?.challenge_type === "group_relay";
  if (!splitMode) return { splitMode: false, incomplete: 0 };

  const { data: rows } = await (supabase as any)
    .from("parayanam_schedule")
    .select("id")
    .eq("challenge_session_id", sessionId)
    .eq("assigned_user_id", userId);
  const ids = ((rows ?? []) as { id: string }[]).map((r) => r.id);
  if (!ids.length) return { splitMode: true, incomplete: 0 };

  const { data: prog } = await (supabase as any)
    .from("parayanam_member_progress")
    .select("schedule_id")
    .eq("user_id", userId)
    .in("schedule_id", ids);
  const done = new Set(((prog ?? []) as { schedule_id: string }[]).map((p) => p.schedule_id));
  return { splitMode: true, incomplete: ids.filter((id) => !done.has(id)).length };
}



/** Participants (and their invite status) for one parayanam. */
export function useSessionParticipants(sessionId: string | null | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!sessionId) {
      setParticipants([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("parayanam_participants")
      .select(COLS)
      .eq("challenge_session_id", sessionId);
    setParticipants((data ?? []) as Participant[]);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusFor = useCallback(
    (userId: string): ParticipantStatus | null =>
      participants.find((p) => p.user_id === userId)?.status ?? null,
    [participants]
  );

  return { participants, loading, refresh, statusFor };
}

/** Invites awaiting the current user's answer. */
export function useMyPendingInvites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setInvites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("parayanam_participants")
      .select(COLS)
      .eq("user_id", user.id)
      .eq("status", "invited");

    const rows = (data ?? []) as Participant[];
    if (!rows.length) {
      setInvites([]);
      setLoading(false);
      return;
    }

    const { data: sessions } = await (supabase as any)
      .from("challenge_sessions")
      .select(
        "id, group_id, start_date, end_date, dashakams_target, parayanam_name, user_id, delivery_mode, participation_type, contribution_amount, payment_url, payment_note"
      )
      .in("id", rows.map((r) => r.challenge_session_id));

    const sessionById = new Map<string, any>(((sessions ?? []) as any[]).map((s) => [s.id, s]));
    const groupIds = Array.from(
      new Set(((sessions ?? []) as any[]).map((s) => s.group_id).filter(Boolean))
    ) as string[];

    const guruIds = Array.from(
      new Set(((sessions ?? []) as any[]).map((s) => s.user_id).filter(Boolean))
    ) as string[];
    let guruNameById = new Map<string, string>();
    if (guruIds.length) {
      const { data: gurus } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", guruIds);
      guruNameById = new Map(
        ((gurus ?? []) as any[]).map((g) => [g.id, g.display_name ?? g.email ?? "Guru"])
      );
    }

    let nameById = new Map<string, string>();
    if (groupIds.length) {
      const { data: groups } = await (supabase as any)
        .from("groups")
        .select("id, group_name")
        .in("id", groupIds);
      nameById = new Map(((groups ?? []) as any[]).map((g) => [g.id, g.group_name]));
    }

    // First live session per parayanam, so the invite can show when it begins.
    const firstSessionBySession = new Map<string, string>();
    const liveIds = ((sessions ?? []) as any[])
      .filter((s) => s.delivery_mode === "LIVE")
      .map((s) => s.id);
    if (liveIds.length) {
      const { data: ls } = await (supabase as any)
        .from("live_sessions_public")
        .select("challenge_session_id, session_date, start_datetime")
        .in("challenge_session_id", liveIds)
        .order("start_datetime", { ascending: true });
      ((ls ?? []) as any[]).forEach((row) => {
        if (!firstSessionBySession.has(row.challenge_session_id))
          firstSessionBySession.set(row.challenge_session_id, row.start_datetime ?? row.session_date);
      });
    }

    setInvites(
      rows.map((r) => {
        const s = sessionById.get(r.challenge_session_id);
        return {
          ...r,
          group_id: s?.group_id ?? null,
          group_name: s?.group_id ? nameById.get(s.group_id) ?? null : null,
          start_date: s?.start_date ?? null,
          end_date: s?.end_date ?? null,
          dashakams_target: s?.dashakams_target ?? null,
          parayanam_name: s?.parayanam_name ?? null,
          guru_name: s?.user_id ? guruNameById.get(s.user_id) ?? null : null,
          delivery_mode: s?.delivery_mode ?? null,
          first_session_at: firstSessionBySession.get(r.challenge_session_id) ?? null,
          participation_type: s?.participation_type ?? null,
          contribution_amount: s?.contribution_amount ?? null,
          payment_url: s?.payment_url ?? null,
          payment_note: s?.payment_note ?? null,
        };
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const respond = useCallback(
    async (inviteId: string, status: "confirmed" | "declined") => {
      setBusyId(inviteId);
      const { error } = await (supabase as any)
        .from("parayanam_participants")
        .update({ status, responded_at: new Date().toISOString() })
        .eq("id", inviteId);
      setBusyId(null);
      if (error) throw new Error(error.message);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    },
    []
  );

  return { invites, loading, busyId, respond, refresh };
}
