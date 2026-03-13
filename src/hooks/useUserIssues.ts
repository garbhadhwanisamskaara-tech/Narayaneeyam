import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserIssue {
  id: string;
  user_id: string | null;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
}

export function useUserIssues(refreshKey: number = 0) {
  const [issues, setIssues] = useState<UserIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("user_issues")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10) as any;
      setIssues(data || []);
    } catch {
      // silent
    }
    setLoading(false);
  }, [refreshKey]);

  useEffect(() => { fetch(); }, [fetch]);
  return { issues, loading, refetch: fetch };
}

export async function submitIssue(issueType: string, description: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from("user_issues").insert({
      user_id: session?.user?.id || null,
      issue_type: issueType,
      description,
      status: "open",
    } as any);
    return true;
  } catch {
    return false;
  }
}
