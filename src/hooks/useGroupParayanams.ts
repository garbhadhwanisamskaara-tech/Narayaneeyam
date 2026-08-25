import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isHiddenSessionState } from "@/lib/parayanamFilters";

export interface GroupParayanam {
  session_id: string;
  parayanam_name: string | null;
  start_date: string | null;
  end_date: string | null;
  finalized_at: string | null;
  /** The current user's invite status for this parayanam, if any. */
  my_status: string | null;
}

/**
 * Every parayanam a group has (owner) or every one the current user is
 * confirmed in (member). A group can run several at the same time, so this
 * list — not groups.active_challenge_session_id — drives the group page.
 */
export function useGroupParayanams(groupId: string | undefined) {
  const [parayanams, setParayanams] = useState<GroupParayanam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!groupId) {
      setParayanams([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: err } = await (supabase as any).rpc("get_group_parayanams", {
      p_group_id: groupId,
    });
    if (err) {
      setError(err.message);
      setParayanams([]);
    } else {
      setError(null);
      const rows = ((data ?? []) as GroupParayanam[]).slice().sort((a, b) => {
        const av = a.start_date ?? "";
        const bv = b.start_date ?? "";
        return av < bv ? 1 : av > bv ? -1 : 0;
      });
      setParayanams(rows);
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { parayanams, loading, error, refresh };
}

/** Human label for a parayanam in pickers: name plus its date range. */
export function parayanamLabel(p: GroupParayanam) {
  const fmt = (d: string | null) =>
    d
      ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "—";
  const name = p.parayanam_name || "Parayanam";
  return `${name} · ${fmt(p.start_date)} – ${fmt(p.end_date)}`;
}
