import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ParayanamTemplate {
  id: string;
  template_name: string;
  description: string | null;
  dashakam_list: number[];
  sort_order: number;
}

const TEMPLATE_COLS = "id, template_name, description, dashakam_list, sort_order";

/** Read-only list of official parayanam templates, ordered for display. */
export function useParayanamTemplates() {
  const [templates, setTemplates] = useState<ParayanamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await (supabase as any)
      .from("parayanam_templates")
      .select(TEMPLATE_COLS)
      .order("sort_order", { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setTemplates((data ?? []) as ParayanamTemplate[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { templates, loading, error, refresh };
}
