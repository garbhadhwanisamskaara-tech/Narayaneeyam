import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import type { LastPosition } from "@/hooks/useMemberProgress";

interface ContinueBannerProps {
  position: LastPosition;
  onContinue: () => void;
  onDismiss: () => void;
}

export default function ContinueBanner({ position, onContinue, onDismiss }: ContinueBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="mb-6 rounded-xl border border-secondary/40 bg-gradient-to-r from-secondary/15 via-card to-primary/10 p-4 shadow-gold"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">🙏</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground font-sans">
              Continue where you left off?
            </p>
            <p className="text-xs text-muted-foreground font-sans truncate">
              Dashakam {position.dashakam_number} — {position.dashakam_name} · Verse {position.verse_number}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-gold px-4 py-2 text-sm font-semibold text-primary shadow-gold hover:scale-105 transition-transform font-sans"
          >
            <Play className="h-3.5 w-3.5" /> Continue
          </button>
          <button
            onClick={onDismiss}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors font-sans"
          >
            Start Fresh
          </button>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
