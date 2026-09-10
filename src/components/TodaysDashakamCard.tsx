import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic } from "lucide-react";
import { useMyDashakamQueue } from "@/hooks/useMyDashakamQueue";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Shows the dashakam already allocated to the signed-in participant for today,
 * using the same parayanam_schedule data the queue/garden/reminders use.
 * Hidden when there is no active parayanam or no allocation for today.
 */
export default function TodaysDashakamCard() {
  const { user } = useAuth();
  const { loading, todayRows } = useMyDashakamQueue();

  if (!user || loading) return null;
  const first = todayRows[0]?.items[0];
  if (!first) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="inline-flex items-center gap-4 rounded-xl border border-secondary/40 bg-card/90 backdrop-blur-sm px-6 py-4 shadow-gold"
    >
      <div className="text-left">
        <p className="text-sm text-muted-foreground font-sans">Today's Dashakam</p>
        <p className="font-display text-foreground font-semibold">Dashakam {first.dashakamNo}</p>
        {first.sourceName !== "Personal" && (
          <p className="text-xs text-muted-foreground font-sans">{first.sourceName}</p>
        )}
      </div>
      <Link
        to={`/chant/${first.dashakamNo}`}
        className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
      >
        <Mic className="h-4 w-4" />
        Chant Now
      </Link>
    </motion.div>
  );
}
