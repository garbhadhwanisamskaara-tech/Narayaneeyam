import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Headphones, X, Sparkles } from "lucide-react";
import {
  getTodaysFestival,
  isFestivalDismissedToday,
  dismissFestivalToday,
  type FestivalDashakam,
} from "@/lib/festivalDashakam";

export default function FestivalBanner() {
  const [festival, setFestival] = useState<FestivalDashakam | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showMiniBadge, setShowMiniBadge] = useState(false);

  useEffect(() => {
    if (isFestivalDismissedToday()) {
      setShowMiniBadge(true);
      return;
    }
    getTodaysFestival().then((f) => setFestival(f));
  }, []);

  const handleDismiss = () => {
    dismissFestivalToday();
    setDismissed(true);
    setShowMiniBadge(true);
  };

  const handleReopen = () => {
    // Clear dismissed state for this session to re-show
    localStorage.removeItem("festival_dismissed");
    setShowMiniBadge(false);
    setDismissed(false);
    getTodaysFestival().then((f) => setFestival(f));
  };

  // Mini badge when dismissed
  if (showMiniBadge && !festival) return null;
  if (showMiniBadge) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={handleReopen}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/30 bg-card px-4 py-2 text-sm font-sans text-secondary shadow-gold hover:bg-secondary/10 transition-colors"
      >
        <Sparkles className="h-4 w-4" />
        Festival Highlight
      </motion.button>
    );
  }

  if (!festival || dismissed) return null;

  const hasSingleDashakam = festival.dashakam_list.length === 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mb-6 rounded-2xl border border-secondary/30 bg-gradient-to-br from-card via-card to-secondary/5 p-6 shadow-gold relative overflow-hidden"
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Dismiss for today"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Decorative glow */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl animate-glow-pulse" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-secondary" />
            <span className="text-sm font-sans font-semibold text-secondary tracking-wide uppercase">
              Today's Dashakam
            </span>
          </div>

          <h3 className="font-display text-xl font-bold text-foreground mb-1">
            {festival.festival_name}
          </h3>

          {festival.custom_message && (
            <p className="text-sm text-muted-foreground font-sans italic mb-4">
              {festival.custom_message}
            </p>
          )}

          <p className="text-sm text-foreground font-sans mb-5">
            Today's recommended Dashakam{festival.dashakam_list.length > 1 ? "s" : ""}:{" "}
            <span className="font-semibold text-primary">
              {festival.dashakam_list.map((d) => `Dashakam ${d}`).join(", ")}
            </span>
          </p>

          {hasSingleDashakam ? (
            <div className="flex flex-wrap gap-3">
              <Link
                to={`/chant?dashakam=${festival.dashakam_list[0]}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-peacock px-5 py-2.5 text-sm font-sans font-semibold text-primary-foreground shadow-peacock hover:opacity-90 transition-opacity"
              >
                <Mic className="h-4 w-4" />
                Chant
              </Link>
              <Link
                to={`/podcast?dashakam=${festival.dashakam_list[0]}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-sans font-semibold text-primary shadow-gold hover:opacity-90 transition-opacity"
              >
                <Headphones className="h-4 w-4" />
                Listen
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-sans">Select a Dashakam:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {festival.dashakam_list.map((d) => (
                  <div key={d} className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="font-display text-sm font-semibold text-foreground mb-2">
                      Dashakam {d}
                    </p>
                    <div className="flex justify-center gap-2">
                      <Link
                        to={`/chant?dashakam=${d}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-peacock px-3 py-1.5 text-xs font-sans font-semibold text-primary-foreground"
                      >
                        <Mic className="h-3 w-3" />
                        Chant
                      </Link>
                      <Link
                        to={`/podcast?dashakam=${d}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-sans font-semibold text-primary"
                      >
                        <Headphones className="h-3 w-3" />
                        Listen
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
