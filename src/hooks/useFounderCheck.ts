import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useFounderCheck() {
  const { user, loading: authLoading } = useAuth();
  const [isFounder, setIsFounder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsFounder(false); setLoading(false); return; }

    (async () => {
      try {
        if (!supabase) { setIsFounder(false); setLoading(false); return; }
        // Check for founder OR admin role
        const { data: founderData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "founder" } as any);
        if (founderData) { setIsFounder(true); setLoading(false); return; }
        const { data: adminData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
        setIsFounder(!!adminData);
      } catch {
        setIsFounder(false);
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  return { isFounder, loading: loading || authLoading };
}
