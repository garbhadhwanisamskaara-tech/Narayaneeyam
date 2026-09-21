import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
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

export default function JourneyHomePrompt() {
  const { user } = useAuth();
  const [items, setItems] = useState<DiscoverableJourney[]>([]);
  const [loading, setLoading] = useState(true);

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

  const remove = (runId: string) => {
    setItems((prev) => prev.filter((i) => i.run_id !== runId));
  };

  if (!user || loading || items.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      {items.map((item) => (
        <JourneyHomeCard key={item.run_id} item={item} onResolved={() => remove(item.run_id)} />
      ))}
    </div>
  );
}

function JourneyHomeCard({ item, onResolved }: { item: DiscoverableJourney; onResolved: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decline = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await (supabase as any)
        .from("journey_home_dismissals")
        .insert({ user_id: user.id, run_id: item.run_id });
    } catch (e) {
      console.error("Could not record journey dismissal", e);
    } finally {
      setBusy(false);
      onResolved();
    }
  };

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      // effective_start_date is computed server-side by the enrollment
      // trigger -- same insert shape as useJourneyEnrollment's join().
      const { error: err } = await (supabase as any).from("journey_enrollments").insert({
        user_id: user.id,
        journey_id: item.journey_id,
        run_id: item.run_id,
      });
      if (err) throw err;

      track("journey_joined", { journey_id: item.journey_id, source: "home_prompt" });
      setBusy(false);
      onResolved();
      navigate(`/journeys/${item.journey_slug}`);
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Could not join this journey. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-start gap-4">
        <Footprints className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-foreground">Start {item.journey_title}?</p>
          <p className="mt-1 text-sm text-muted-foreground font-sans">
            {item.journey_short_description ?? `${item.duration_days}-day guided path`}
          </p>
          {error && <p className="mt-2 text-sm text-destructive font-sans">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void accept()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Yes, Start
            </button>
            <button
              onClick={() => void decline()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> No
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
