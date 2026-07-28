import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useChallengeSessions } from "@/hooks/useChallengeSessions";
import ProgressRing from "@/components/ProgressRing";
import { Skeleton } from "@/components/ui/skeleton";

const MODE_LABELS: Record<string, string> = {
  saptaah: "Narayaneeyam Saptaah",
  "21_day": "21-Day Parayanam",
  "100_day": "100-Day Parayanam",
  daily: "Daily Parayanam",
};

const MODE_TOTAL_DAYS: Record<string, number | null> = {
  saptaah: 7,
  "21_day": 21,
  "100_day": 100,
  daily: null,
};

const STATE_LABEL: Record<string, string> = {
  sankalpam_taken: "Sankalpam taken",
  in_progress: "In progress",
  paused: "Paused",
};

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const ms = to.setHours(0, 0, 0, 0) - from.setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000);
}

export default function ActiveChallengeCard() {
  const navigate = useNavigate();
  const { sessions, isLoading, error } = useChallengeSessions();

  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl mb-6" />;
  }
  if (error) return null;

  const session = sessions[0] ?? null;

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 mb-6 flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-secondary shrink-0" />
          <p className="font-display text-base text-foreground">
            Begin your parayanam — the path is ready.
          </p>
        </div>
        <button
          onClick={() => navigate("/parayanam/new")}
          className="rounded-full bg-gradient-gold px-5 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
        >
          Start a parayanam
        </button>
      </motion.div>
    );
  }

  const totalDays = MODE_TOTAL_DAYS[session.mode] ?? null;
  const modeLabel = MODE_LABELS[session.mode] ?? "Parayanam";
  const stateLabel = STATE_LABEL[session.spiritual_state ?? ""] ?? "Active";
  const today = new Date().toISOString().slice(0, 10);
  const dayN = Math.min(
    Math.max(1, daysBetween(session.start_date, today) + 1),
    totalDays ?? Number.MAX_SAFE_INTEGER,
  );
  const daysRemaining = session.end_date ? Math.max(0, daysBetween(today, session.end_date)) : null;
  const pct = session.dashakams_target > 0
    ? Math.min(100, Math.round((session.dashakams_done / session.dashakams_target) * 100))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-secondary/40 bg-card p-5 mb-6 flex items-center gap-5"
    >
      <div className="relative shrink-0">
        <ProgressRing percent={pct} size={84} strokeWidth={6} color="hsl(var(--secondary))" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-sm font-bold text-foreground">{pct}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-display text-lg md:text-xl font-semibold text-secondary truncate">
          {modeLabel}
        </p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground font-sans mt-0.5">
          {stateLabel}
          {totalDays !== null && (
            <span className="ml-2 normal-case tracking-normal">· Day {dayN} of {totalDays}</span>
          )}
        </p>
        <p className="text-sm text-foreground font-sans mt-2">
          {session.dashakams_done} of {session.dashakams_target} dashakams offered
        </p>
        {session.mode !== "daily" && daysRemaining !== null && (
          <p className="text-xs text-muted-foreground font-sans mt-1">
            {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </p>
        )}
      </div>
    </motion.div>
  );
}
