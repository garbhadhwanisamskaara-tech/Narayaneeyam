import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

interface DiscoverableJourney {
  run_id: string;
  journey_id: string;
  journey_slug: string;
  journey_title: string;
  journey_short_description: string | null;
  duration_days: number;
  cover_image: string | null;
}

export default function JourneyHomeFloatingPrompt() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<DiscoverableJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await (supabase as any).rpc("get_discoverable_journeys_for_me");
    setItems((data ?? []) as DiscoverableJourney[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const item = items[0];

  const dismiss = async () => {
    if (!user || !item || busy) return;
    setBusy(true);
    setError(null);
    try {
      await (supabase as any)
        .from("journey_home_dismissals")
        .insert({ user_id: user.id, run_id: item.run_id });
    } catch (dismissError) {
      console.error("Could not record journey dismissal", dismissError);
    } finally {
      setItems((previous) => previous.filter((candidate) => candidate.run_id !== item.run_id));
      setBusy(false);
    }
  };

  const accept = async () => {
    if (!user || !item || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await (supabase as any).from("journey_enrollments").insert({
        user_id: user.id,
        journey_id: item.journey_id,
        run_id: item.run_id,
      });
      if (insertError) throw insertError;

      track("journey_joined", { journey_id: item.journey_id, source: "home_prompt" });
      navigate(`/journeys/${item.journey_slug}`);
    } catch (acceptError: unknown) {
      const message = acceptError instanceof Error ? acceptError.message : "Could not join this journey. Please try again.";
      setError(message);
      setBusy(false);
    }
  };

  if (!user || loading || !item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 mx-auto max-w-md rounded-xl border border-primary/30 bg-card p-4 shadow-peacock lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0 lg:w-96"
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-label={`Start ${item.journey_title}`}
      onClick={() => void accept()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          void accept();
        }
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy}
        className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
        aria-label="Dismiss guided journey"
        onClick={(event) => {
          event.stopPropagation();
          void dismiss();
        }}
      >
        <X className="h-4 w-4" />
      </Button>

      <div className="flex items-start gap-3 pr-7">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Footprints className="h-5 w-5 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-semibold text-foreground">Start {item.journey_title}?</p>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            {item.journey_short_description ?? `${item.duration_days}-day guided path`}
          </p>
          <p className="mt-2 font-sans text-xs font-semibold text-primary">Tap to begin</p>
          {error && <p className="mt-2 font-sans text-xs text-destructive">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
}