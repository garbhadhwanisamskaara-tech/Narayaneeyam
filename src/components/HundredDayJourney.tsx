import { useState } from "react";
import { CheckCircle2, Circle, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  getJourneyProgress,
  startJourney,
  markDayComplete,
  type JourneyProgress,
} from "@/data/devotionPathways";
import type { Dashakam } from "@/data/narayaneeyam";

interface Props {
  allDashakams: Dashakam[];
  onDashakamClick: (dashakamNumber: number) => void;
}

export default function HundredDayJourney({ allDashakams, onDashakamClick }: Props) {
  const [progress, setProgress] = useState<JourneyProgress | null>(getJourneyProgress);

  const completedSet = new Set(progress?.completions.map((c) => c.dashakam) ?? []);
  const completedCount = completedSet.size;
  const pct = Math.round((completedCount / 100) * 100);

  const handleStart = () => {
    const p = startJourney();
    setProgress(p);
  };

  const handleComplete = (dashakam: number) => {
    const p = markDayComplete(dashakam);
    setProgress({ ...p });
  };

  // Find next uncompleted dashakam
  const nextDashakam = Array.from({ length: 100 }, (_, i) => i + 1).find(
    (n) => !completedSet.has(n)
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        100 Day Journey
      </h1>
      <p className="text-sm text-muted-foreground mb-4 font-sans">
        One Dashakam per day · Build a transformative practice
      </p>

      {/* Progress bar */}
      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-foreground font-sans">
            {completedCount} / 100 days completed
          </span>
          <span className="text-xs text-muted-foreground font-sans">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        {!progress && (
          <Button onClick={handleStart} className="mt-4 w-full" size="sm">
            <Play className="h-4 w-4 mr-2" /> Start Journey
          </Button>
        )}
        {progress && nextDashakam && (
          <p className="mt-3 text-xs text-muted-foreground font-sans">
            Next: Day {nextDashakam} — Dashakam {nextDashakam}
          </p>
        )}
        {completedCount === 100 && (
          <p className="mt-3 text-sm font-semibold text-primary font-sans">
            🎉 Journey Complete! Congratulations!
          </p>
        )}
      </div>

      {/* Day list */}
      <div className="space-y-1.5">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((day) => {
          const d = allDashakams.find((dd) => dd.id === day);
          const done = completedSet.has(day);
          return (
            <div
              key={day}
              className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors ${
                done
                  ? "border-primary/20 bg-primary/5"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <button
                onClick={() => !done && handleComplete(day)}
                className="shrink-0"
                title={done ? "Completed" : "Mark complete"}
                disabled={done}
              >
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                )}
              </button>
              <button
                onClick={() => onDashakamClick(day)}
                className="flex-1 text-left min-w-0"
              >
                <span className="text-sm font-sans">
                  <span className="font-semibold text-foreground">Day {day}</span>
                  <span className="text-muted-foreground"> — Dashakam {day}</span>
                </span>
                {d && (
                  <p className="text-xs text-muted-foreground font-sans truncate">
                    {d.title_english}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
