import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Total dashakam completions recorded in the current calendar year.
 * Counts rows (not distinct dashakam numbers) so repeats — solo plus
 * parayanam, or the same dashakam in two parayanams — each add one.
 */
export function useYearlyDashakamCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!user) {
        setCount(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      const year = new Date().getFullYear();
      const { count: rows, error } = await (supabase as any)
        .from("user_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("completed_date", `${year}-01-01`)
        .lte("completed_date", `${year}-12-31`);

      if (cancelled) return;
      setCount(error ? 0 : rows ?? 0);
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { count, loading, year: new Date().getFullYear() };
}
