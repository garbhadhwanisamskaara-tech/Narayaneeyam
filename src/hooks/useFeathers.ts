import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FeatherMode = "chant" | "learn" | "podcast";

export interface Feather {
  dashakam_no: number;
  mode: FeatherMode;
}

/**
 * Awards a feather for completing a dashakam in a given mode.
 * Duplicates are rejected by the table's unique constraint — treated as a no-op.
 */
export async function awardFeather(
  userId: string | undefined,
  dashakamNo: number,
  mode: FeatherMode
): Promise<void> {
  if (!userId || !dashakamNo) return;
  try {
    const { error } = await (supabase as any)
      .from("feathers")
      .insert({ user_id: userId, dashakam_no: dashakamNo, mode });
    // 23505 = unique violation → already collected, nothing to do
    if (error && error.code !== "23505") {
      // silent fail — feathers are cosmetic
    }
  } catch {
    // silent fail
  }
}

export function useFeathers() {
  const { user } = useAuth();
  const [feathers, setFeathers] = useState<Feather[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setFeathers([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await (supabase as any)
        .from("feathers")
        .select("dashakam_no, mode")
        .eq("user_id", user.id);
      setFeathers((data as Feather[]) ?? []);
    } catch {
      setFeathers([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const award = useCallback(
    async (dashakamNo: number, mode: FeatherMode) => {
      await awardFeather(user?.id, dashakamNo, mode);
      refresh();
    },
    [user, refresh]
  );

  return { feathers, loading, refresh, award, isGuest: !user };
}
