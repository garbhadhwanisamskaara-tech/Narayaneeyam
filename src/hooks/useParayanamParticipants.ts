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
      .select("id, group_id, start_date, end_date, dashakams_target")
      .in("id", rows.map((r) => r.challenge_session_id));

    const sessionById = new Map<string, any>(((sessions ?? []) as any[]).map((s) => [s.id, s]));
    const groupIds = Array.from(
      new Set(((sessions ?? []) as any[]).map((s) => s.group_id).filter(Boolean))
    ) as string[];

    let nameById = new Map<string, string>();
    if (groupIds.length) {
      const { data: groups } = await (supabase as any)
        .from("groups")
        .select("id, group_name")
        .in("id", groupIds);
      nameById = new Map(((groups ?? []) as any[]).map((g) => [g.id, g.group_name]));
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
