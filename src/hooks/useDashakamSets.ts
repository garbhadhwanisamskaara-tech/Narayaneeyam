import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DashakamSet {
  id: string;
  set_name: string;
  dashakam_list: number[];
  description: string | null;
  is_official: boolean;
  forked_from_id: string | null;
  created_by: string | null;
}

const SET_COLS = "id, set_name, dashakam_list, description, is_official, forked_from_id, created_by";

/** Official sets + the current user's own (forked/custom) sets. */
export function useDashakamSets() {
  const { user } = useAuth();
  const [sets, setSets] = useState<DashakamSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const filter = user ? `is_official.eq.true,created_by.eq.${user.id}` : "is_official.eq.true";
    const { data, error: err } = await (supabase as any)
      .from("dashakam_sets")
      .select(SET_COLS)
      .eq("is_active", true)
      .or(filter)
      .order("is_official", { ascending: false })
      .order("set_name", { ascending: true });
    if (err) setError(err.message);
    else {
      setError(null);
      setSets((data ?? []) as DashakamSet[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** "Customize for my group" — copy an official set into a private, editable one. */
  const forkSet = useCallback(
    async (source: DashakamSet, name?: string): Promise<DashakamSet> => {
      if (!user) throw new Error("Please sign in first.");
      const { data, error: err } = await (supabase as any)
        .from("dashakam_sets")
        .insert({
          set_name: name?.trim() || `${source.set_name} (my group)`,
          dashakam_list: source.dashakam_list,
          description: source.description ?? "",
          is_official: false,
          created_by: user.id,
          forked_from_id: source.id,
        })
        .select(SET_COLS)
        .single();
      if (err) throw new Error(err.message);
      await refresh();
      return data as DashakamSet;
    },
    [user, refresh]
  );

  /** Edit the dashakam list of one of your own sets. */
  const updateSetList = useCallback(
    async (setId: string, list: number[]) => {
      const { error: err } = await (supabase as any)
        .from("dashakam_sets")
        .update({ dashakam_list: list, updated_at: new Date().toISOString() })
        .eq("id", setId);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh]
  );

  return { sets, loading, error, refresh, forkSet, updateSetList };
}
