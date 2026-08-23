import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getTicketViewedAt } from "@/lib/ticketViews";

export interface TicketReplyAlert {
  ticketId: string;
  subject: string;
  message: string;
  createdAt: string;
}

/**
 * Support tickets with a reply from support that this user has not opened yet.
 * Derived live — no notifications table, no "mark as read" action.
 */
export function useTicketReplyAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<TicketReplyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: tickets } = await (supabase as any)
        .from("support_tickets")
        .select("id, subject")
        .eq("user_id", user.id);
      const rows = (tickets ?? []) as { id: string; subject: string }[];
      if (!rows.length) {
        setAlerts([]);
        setLoading(false);
        return;
      }
      const subjectById = new Map(rows.map((t) => [t.id, t.subject]));

      const { data: updates } = await (supabase as any)
        .from("ticket_updates")
        .select("ticket_id, message, created_at, is_admin_reply, is_internal")
        .in("ticket_id", rows.map((t) => t.id))
        .eq("is_admin_reply", true)
        .eq("is_internal", false)
        .order("created_at", { ascending: false });

      const latest = new Map<string, TicketReplyAlert>();
      for (const u of (updates ?? []) as any[]) {
        if (latest.has(u.ticket_id)) continue;
        latest.set(u.ticket_id, {
          ticketId: u.ticket_id,
          subject: subjectById.get(u.ticket_id) ?? "Your ticket",
          message: u.message ?? "",
          createdAt: u.created_at,
        });
      }

      setAlerts(
        Array.from(latest.values()).filter(
          (a) => new Date(a.createdAt).getTime() > getTicketViewedAt(a.ticketId)
        )
      );
    } catch {
      setAlerts([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onViewed = () => void load();
    window.addEventListener("ticket-viewed", onViewed);
    return () => window.removeEventListener("ticket-viewed", onViewed);
  }, [load]);

  return { alerts, loading, refresh: load };
}
