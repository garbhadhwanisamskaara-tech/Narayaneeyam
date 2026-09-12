import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

function todayInIndia(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Kolkata" });
}

export function usePaidParayanamBadge(): string[] {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const { data } = useQuery({
    queryKey: ["paid-parayanam-badge", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];

      const { data: participantRows, error: participantError } = await (supabase as any)
        .from("parayanam_participants")
        .select("challenge_session_id")
        .eq("user_id", userId)
        .eq("contribution_status", "confirmed");

      if (participantError) throw participantError;

      const sessionIds = Array.from(
        new Set(
          ((participantRows ?? []) as { challenge_session_id: string }[])
            .map((row) => row.challenge_session_id)
            .filter(Boolean),
        ),
      );
      if (!sessionIds.length) return [];

      const { data: sessions, error: sessionError } = await (supabase as any)
        .from("challenge_sessions")
        .select("id, parayanam_name, end_date")
        .in("id", sessionIds)
        .eq("participation_type", "PAID")
        .is("cancelled_at", null)
        .is("completed_at", null);

      if (sessionError) throw sessionError;

      const today = todayInIndia();
      return Array.from(
        new Set(
          ((sessions ?? []) as { parayanam_name: string | null; end_date: string | null }[])
            .filter((session) => !session.end_date || session.end_date >= today)
            .map((session) => session.parayanam_name?.trim())
            .filter((name): name is string => Boolean(name)),
        ),
      );
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!userId) return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["paid-parayanam-badge", userId] });
    };
    const channel = supabase
      .channel(`paid-parayanam-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "parayanam_participants",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "challenge_sessions" },
        refresh,
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return data ?? [];
}