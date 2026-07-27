import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Group {
  id: string;
  group_name: string;
  owner_id: string;
  active_challenge_session_id: string | null;
  status: string;
  created_at: string;
}

export interface GroupInvite {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  revoked: boolean;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  display_name: string;
  completed: number;
}

const GROUP_COLS = "id, group_name, owner_id, active_challenge_session_id, status, created_at";

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Absolute invite URL for the deployment the user is currently on. */
export function inviteLink(token: string) {
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://www.narayaneeyam.app";
  return `${origin}/join/${token}`;
}

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Groups the user belongs to (via group_members) plus groups they own.
    const [memberRes, ownedRes] = await Promise.all([
      (supabase as any)
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id)
        .is("left_at", null),
      (supabase as any).from("groups").select(GROUP_COLS).eq("owner_id", user.id),
    ]);

    if (memberRes.error && ownedRes.error) {
      setError(memberRes.error.message);
      setLoading(false);
      return;
    }

    const memberIds: string[] = (memberRes.data ?? []).map((r: any) => r.group_id);
    let joined: Group[] = [];
    if (memberIds.length) {
      const { data } = await (supabase as any)
        .from("groups")
        .select(GROUP_COLS)
        .in("id", memberIds);
      joined = (data ?? []) as Group[];
    }

    const all = [...((ownedRes.data ?? []) as Group[]), ...joined];
    const unique = Array.from(new Map(all.map((g) => [g.id, g])).values()).sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1
    );

    setError(null);
    setGroups(unique);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createGroup = useCallback(
    async (name: string): Promise<Group> => {
      if (!user) throw new Error("Please sign in first.");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Please enter a group name.");
      if (trimmed.length > 60) throw new Error("Group name must be 60 characters or less.");

      const { data, error: err } = await (supabase as any)
        .from("groups")
        .insert({ group_name: trimmed, owner_id: user.id })
        .select(GROUP_COLS)
        .single();
      if (err) throw new Error(err.message);

      // Owner is a member too, so member lists and progress include them.
      await (supabase as any)
        .from("group_members")
        .insert({ group_id: data.id, user_id: user.id, role: "owner" });

      await refresh();
      return data as Group;
    },
    [user, refresh]
  );

  return { groups, loading, error, refresh, createGroup };
}

/** Members of a group, with display name and progress in the group's active session. */
export function useGroupMembers(groupId: string | undefined, sessionId: string | null | undefined) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);

    const { data, error: err } = await (supabase as any)
      .from("group_members")
      .select("id, group_id, user_id, role, joined_at, left_at")
      .eq("group_id", groupId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });

    if (err) {
      setError(err.message);
      setMembers([]);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Omit<GroupMember, "display_name" | "completed">[];
    const ids = rows.map((r) => r.user_id);

    const [profRes, progRes] = await Promise.all([
      ids.length
        ? (supabase as any).from("profiles").select("id, display_name").in("id", ids)
        : Promise.resolve({ data: [] }),
      sessionId && ids.length
        ? (supabase as any)
            .from("user_progress")
            .select("user_id, dashakam_no")
            .eq("challenge_session_id", sessionId)
            .in("user_id", ids)
        : Promise.resolve({ data: [] }),
    ]);

    const nameById = new Map<string, string>(
      (profRes.data ?? []).map((p: any) => [p.id, p.display_name ?? "Devotee"])
    );
    const counts = new Map<string, number>();
    for (const row of (progRes.data ?? []) as any[]) {
      counts.set(row.user_id, (counts.get(row.user_id) ?? 0) + 1);
    }

    setError(null);
    setMembers(
      rows.map((r) => ({
        ...r,
        display_name: nameById.get(r.user_id) ?? "Devotee",
        completed: counts.get(r.user_id) ?? 0,
      }))
    );
    setLoading(false);
  }, [groupId, sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const removeMember = useCallback(
    async (memberId: string) => {
      const { error: err } = await (supabase as any)
        .from("group_members")
        .update({ left_at: new Date().toISOString() })
        .eq("id", memberId);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  return { members, loading, error, refresh, removeMember };
}

export function useGroupInvite(groupId: string | undefined) {
  const { user } = useAuth();
  const [invite, setInvite] = useState<GroupInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data, error: err } = await (supabase as any)
      .from("group_invites")
      .select("id, group_id, token, created_by, revoked, created_at")
      .eq("group_id", groupId)
      .eq("revoked", false)
      .order("created_at", { ascending: false })
      .limit(1);
    if (err) setError(err.message);
    else {
      setError(null);
      setInvite((data?.[0] ?? null) as GroupInvite | null);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const generateInvite = useCallback(async () => {
    if (!user) throw new Error("Please sign in first.");
    if (!groupId) throw new Error("Missing group.");
    const { data, error: err } = await (supabase as any)
      .from("group_invites")
      .insert({ group_id: groupId, token: randomToken(), created_by: user.id, revoked: false })
      .select("id, group_id, token, created_by, revoked, created_at")
      .single();
    if (err) throw new Error(err.message);
    setInvite(data as GroupInvite);
    return data as GroupInvite;
  }, [user, groupId]);

  const revokeInvite = useCallback(async () => {
    if (!invite) return;
    const { error: err } = await (supabase as any)
      .from("group_invites")
      .update({ revoked: true })
      .eq("id", invite.id);
    if (err) throw new Error(err.message);
    setInvite(null);
  }, [invite]);

  const regenerateInvite = useCallback(async () => {
    await revokeInvite();
    return generateInvite();
  }, [revokeInvite, generateInvite]);

  return { invite, loading, error, refresh, generateInvite, revokeInvite, regenerateInvite };
}
