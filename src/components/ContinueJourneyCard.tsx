import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Footprints, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ActiveJourneyCard {
  enrollment_id: string;
  journey_id: string;
  journey_slug: string;
  journey_title: string;
  current_day_number: number;
  current_day_title: string | null;
  current_day_completed: boolean;
}

/**
 * "Continue your journey" Home card for users with an ACTIVE journey
 * enrollment. Separate from JourneyHomeFloatingPrompt (not-yet-joined users).
 */
export default function ContinueJourneyCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const queryKey = ["my-active-journey-cards", user?.id];

  const { data } = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async (): Promise<ActiveJourneyCard[]> => {
      const { data, error } = await (supabase as any).rpc("get_my_active_journey_cards");
      if (error) throw error;
      return (data ?? []) as ActiveJourneyCard[];
    },
  });

  if (!user || !data || data.length === 0) return null;

  const rows = data.filter((r) => !hidden.has(r.enrollment_id));
  if (rows.length === 0) return null;
  const current = rows.find((r) => r.enrollment_id === selectedId) ?? rows[0];

  const dismiss = async () => {
    const id = current.enrollment_id;
    setHidden((prev) => new Set(prev).add(id));
    const today = new Date().toISOString().split("T")[0];
    try {
      await (supabase as any)
        .from("journey_enrollments")
        .update({ home_card_dismissed_until: today })
        .eq("id", id)
        .eq("user_id", user.id);
    } catch {
      // silent — hidden for this view regardless
    }
    queryClient.invalidateQueries({ queryKey });
  };

  const dayLabel = `Day ${current.current_day_number}${current.current_day_title ? `: ${current.current_day_title}` : ""}`;

  return (
    <div className="flex flex-col items-center gap-2">
      {rows.length > 1 && (
        <select
          aria-label="Choose journey"
          value={current.enrollment_id}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-border bg-card/90 px-3 py-1.5 font-sans text-xs text-foreground"
        >
          {rows.map((r) => (
            <option key={r.enrollment_id} value={r.enrollment_id}>
              {r.journey_title}
            </option>
          ))}
        </select>
      )}
      {!current.current_day_completed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative inline-flex items-center gap-4 rounded-xl border border-secondary/40 bg-card/90 backdrop-blur-sm px-6 py-4 shadow-gold"
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute -top-2 -right-2 rounded-full bg-muted p-1 text-muted-foreground shadow-sm hover:bg-muted/80 hover:text-foreground transition-colors"
            aria-label="Hide for today"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="text-left">
            <p className="text-sm text-muted-foreground font-sans">Continue your journey</p>
            <p className="font-display text-foreground font-semibold">{current.journey_title}</p>
            <p className="text-xs text-muted-foreground font-sans">{dayLabel}</p>
          </div>
          <Link
            to={`/journeys/${current.journey_slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
          >
            <Footprints className="h-4 w-4" />
            Continue
          </Link>
        </motion.div>
      )}
    </div>
  );
}
