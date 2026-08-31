import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isHiddenSessionState } from "@/lib/parayanamFilters";
import { fetchEligibleSessionIds } from "@/lib/parayanamEligibility";

export interface GroupParayanam {
  session_id: string;
  parayanam_name: string | null;
  start_date: string | null;
  end_date: string | null;
  finalized_at: string | null;
  /** The current user's invite status for this parayanam, if any. */
  my_status: string | null;
  distribution_mode?: string | null;
  challenge_type?: string | null;
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
      let rows = ((data ?? []) as GroupParayanam[]).slice().sort((a, b) => {
        const av = a.start_date ?? "";
        const bv = b.start_date ?? "";
        return av < bv ? 1 : av > bv ? -1 : 0;
      });

      // The RPC doesn't expose technical_state, so drop archived/cancelled
      // parayanams here — they stay in the database, just out of sight.
      if (rows.length) {
        const { data: stateRows } = await (supabase as any)
          .from("challenge_sessions")
          .select("id, technical_state, distribution_mode, challenge_type")
          .in(
            "id",
            rows.map((r) => r.session_id)
          );
        type StateRow = {
          id: string;
          technical_state: string | null;
          distribution_mode: string | null;
          challenge_type: string | null;
        };
        const stateList = (stateRows ?? []) as StateRow[];
        const hidden = new Set(
          stateList.filter((s) => isHiddenSessionState(s.technical_state)).map((s) => s.id)
        );
        if (hidden.size) rows = rows.filter((r) => !hidden.has(r.session_id));
        const byId = new Map(stateList.map((s) => [s.id, s]));
        rows = rows.map((r) => ({
          ...r,
          distribution_mode: byId.get(r.session_id)?.distribution_mode ?? null,
          challenge_type: byId.get(r.session_id)?.challenge_type ?? null,
        }));
      }

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
