import { useState } from "react";
import { CheckCircle2, Circle, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  getJourneyProgress,
  startJourney,
  markDayComplete,
  type JourneyProgress,
} from "@/data/devotionPathways";
import { getDashakamName } from "@/hooks/useDashakam";

interface Props {
  onDashakamClick: (dashakamNumber: number) => void;
}

export default function HundredDayJourney({ onDashakamClick }: Props) {
  const [progress, setProgress] = useState<JourneyProgress | null>(getJourneyProgress);
  const { user } = useAuth();

  const completedSet = new Set(progress?.completions.map((c) => c.dashakam) ?? []);
  const completedCount = completedSet.size;
  const pct = Math.round((completedCount / 100) * 100);

  const handleStart = () => {
    const p = startJourney();
    setProgress(p);
  };

  const handleMarkComplete = (dashakamNo: number) => {
    const p = markDayComplete(dashakamNo);
    setProgress(p);
  };

  if (!progress) {
    return (
      <div className="text-center py-12">
        <h2 className="font-display text-2xl font-bold text-foreground mb-3">100-Day Journey</h2>
        <p className="text-sm text-muted-foreground font-sans mb-6 max-w-md mx-auto">
          Complete all 100 Dashakams at your own pace. Track your progress daily and build a consistent chanting practice.
        </p>
        <Button onClick={handleStart} className="bg-primary text-primary-foreground">
          <Play className="h-4 w-4 mr-2" /> Start Journey
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">100-Day Journey</h2>
      <p className="text-sm text-muted-foreground font-sans mb-4">
        {completedCount} of 100 Dashakams completed
      </p>
      <Progress value={pct} className="mb-6 h-3" />

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
          const done = completedSet.has(num);
          return (
            <button
              key={num}
              onClick={() => {
                if (!done) handleMarkComplete(num);
                onDashakamClick(num);
              }}
              title={getDashakamName(num)}
              className={`relative aspect-square rounded-lg text-xs font-sans font-semibold flex items-center justify-center transition-all ${
                done
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-muted text-muted-foreground border border-border hover:bg-muted/80"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4 text-primary" /> : num}
            </button>
          );
        })}
      </div>
    </div>
  );
}
