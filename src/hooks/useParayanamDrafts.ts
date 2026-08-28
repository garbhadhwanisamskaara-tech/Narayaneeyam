import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ParayanamDraft {
  id: string;
  parayanam_name: string | null;
  updated_at: string | null;
  created_at: string | null;
}

/**
 * Draft parayanams belonging to the signed-in Guru.
 *
 * A draft is a `challenge_sessions` row with technical_state = 'DRAFT' and the
 * whole wizard snapshot in `draft_state`. Drafts never have participants,
 * schedule rows or live sessions — nothing is activated until final creation.
 */
export function useParayanamDrafts(groupId: string | undefined, enabled = true) {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<ParayanamDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user || !enabled) {
      setDrafts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = (supabase as any)
      .from("challenge_sessions")
      .select("id, parayanam_name, created_at, updated_at")
      .eq("user_id", user.id)
      .eq("technical_state", "DRAFT")
      .order("updated_at", { ascending: false });
    query = groupId ? query.eq("group_id", groupId) : query.is("group_id", null);

    const { data, error } = await query;
    setDrafts(error ? [] : ((data ?? []) as ParayanamDraft[]));
    setLoading(false);
  }, [user, groupId, enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Removes only this draft row — a draft has no child rows by construction. */
  const discardDraft = useCallback(
    async (draftId: string) => {
      if (!user) return;
      const { error } = await (supabase as any)
        .from("challenge_sessions")
        .delete()
        .eq("id", draftId)
        .eq("user_id", user.id)
        .eq("technical_state", "DRAFT");
      if (error) throw new Error(error.message);
      await refresh();
    },
    [user, refresh],
  );

  return { drafts, loading, refresh, discardDraft };
}
