import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Group {
  id: string;
  name: string;
  owner_id: string;
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

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function inviteLink(token: string) {
  return `narayaneeyam.app/join/${token}`;
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
    const { data, error: err } = await (supabase as any)
      .from("groups")
      .select("id, name, owner_id, created_at")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else {
      setError(null);
      setGroups((data ?? []) as Group[]);
    }
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
        .insert({ name: trimmed, owner_id: user.id })
        .select("id, name, owner_id, created_at")
        .single();
      if (err) throw new Error(err.message);
      await refresh();
      return data as Group;
    },
    [user, refresh]
  );

  return { groups, loading, error, refresh, createGroup };
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
