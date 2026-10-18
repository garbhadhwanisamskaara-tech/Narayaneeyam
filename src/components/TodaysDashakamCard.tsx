import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Headphones, Mic, X } from "lucide-react";
import { useMyDashakamQueue } from "@/hooks/useMyDashakamQueue";
import { useAuth } from "@/contexts/AuthContext";
import {
  dismissTodaysDashakam,
  isTodaysDashakamDismissed,
} from "@/lib/todaysDashakamDismiss";

/** Opens the header bell's queue list (Today's / Pending dashakams). */
function showDashakamQueue() {
  window.dispatchEvent(new CustomEvent("open-dashakam-queue"));
}

/**
 * Shows the dashakam already allocated to the signed-in participant for today,
 * using the same parayanam_schedule data the queue/garden/reminders use.
 * Hidden when there is no active parayanam or no allocation for today, or when
 * the participant hid it with its × — that lasts until the day turns in IST.
 */
export default function TodaysDashakamCard() {
  const { user } = useAuth();
  const { loading, todayRows } = useMyDashakamQueue();
  const [hidden, setHidden] = useState(() => isTodaysDashakamDismissed());

  if (!user || loading || hidden) return null;
  const first = todayRows[0]?.items[0];
  if (!first) return null;

  /** Dashakams still waiting today, beyond the one named on this card. */
  const extra = todayRows.reduce((n, r) => n + r.items.length, 0) - 1;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="relative inline-flex items-center gap-4 rounded-xl border border-secondary/40 bg-card/90 backdrop-blur-sm px-6 py-4 shadow-gold"
    >
      <button
        type="button"
        onClick={() => {
          dismissTodaysDashakam();
          setHidden(true);
        }}
        title="Hide for today"
        aria-label="Hide today's dashakam for the rest of today"
        className="absolute -top-2 -right-2 z-10 rounded-full bg-card border p-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="text-left">
        <p className="text-sm text-muted-foreground font-sans">Today's Dashakam</p>
        <p className="font-display text-foreground font-semibold">Dashakam {first.dashakamNo}</p>
        {extra > 0 && (
          <button
            type="button"
            onClick={showDashakamQueue}
            className="font-sans text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            +{extra} more
          </button>
        )}
        {first.sourceName !== "Personal" && (
          <p className="text-xs text-muted-foreground font-sans">{first.sourceName}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={`/chant/${first.dashakamNo}`}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
        >
          <Mic className="h-4 w-4" />
          Chant Now
        </Link>
        <Link
          to={`/listen?dashakam=${first.dashakamNo}`}
          className="inline-flex items-center gap-2 rounded-lg border border-secondary/50 bg-card/60 px-4 py-2 font-sans text-sm font-semibold text-gold-dark transition-transform hover:scale-105 dark:text-gold-light"
        >
          <Headphones className="h-4 w-4" />
          Listen
        </Link>
      </div>
    </motion.div>
  );
}
