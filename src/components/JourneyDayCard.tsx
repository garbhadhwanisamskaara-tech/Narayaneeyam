import { useNavigate } from "react-router-dom";
import type { JourneyDay } from "@/hooks/useJourney";
import type { JourneyProgress } from "@/hooks/useJourneyProgress";
import { resolveJourneyAction } from "@/lib/journeyActions";
import { Button } from "@/components/ui/button";

interface JourneyDayCardProps {
  day: JourneyDay;
  durationDays: number;
  progress: JourneyProgress[];
  pendingDayId: string | null;
  onComplete: (day: JourneyDay, completed: boolean) => void;
  completionLabel: string;
}

export default function JourneyDayCard({
  day,
  durationDays,
  progress,
  pendingDayId,
  onComplete,
  completionLabel,
}: JourneyDayCardProps) {
  const navigate = useNavigate();
  const dayProgress = progress.find((item) => item.journey_day_id === day.id);
  const completed = dayProgress?.completion_status === "COMPLETED";
  const hasSecondaryAction = !!day.secondary_action_type && day.secondary_action_type !== "NONE";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
        Day {day.day_number} of {durationDays}
        {day.estimated_minutes ? ` • ~${day.estimated_minutes} min` : ""}
      </p>
      <h2 className="mt-1 font-display text-xl font-bold text-foreground">{day.title}</h2>
      {day.hook && <p className="mt-2 font-sans text-sm text-muted-foreground">{day.hook}</p>}
      {day.task_instruction && <p className="mt-3 font-sans text-sm text-foreground">{day.task_instruction}</p>}

      {hasSecondaryAction ? (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 1 of 2
            </p>
            {day.action_type !== "NONE" && (
              <Button
                type="button"
                onClick={() => resolveJourneyAction(day.action_type, day.action_payload, navigate)}
                className="h-auto w-full rounded-lg py-3 font-sans text-sm font-semibold"
              >
                {day.cta_label || "Start"}
              </Button>
            )}
          </div>
          <div>
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Step 2 of 2
            </p>
            <Button
              type="button"
              onClick={() =>
                resolveJourneyAction(day.secondary_action_type ?? "NONE", day.secondary_action_payload, navigate)
              }
              className="h-auto w-full rounded-lg py-3 font-sans text-sm font-semibold"
            >
              {day.secondary_cta_label || "Continue"}
            </Button>
          </div>
        </div>
      ) : (
        day.action_type !== "NONE" && (
          <Button
            type="button"
            onClick={() => resolveJourneyAction(day.action_type, day.action_payload, navigate)}
            className="mt-4 h-auto w-full rounded-lg py-3 font-sans text-sm font-semibold"
          >
            {day.cta_label || "Start"}
          </Button>
        )
      )}

      {day.reflection_text && (
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 font-sans text-sm text-muted-foreground">
          {day.reflection_text}
        </p>
      )}

      <label className="mt-5 flex items-center gap-2 font-sans text-sm text-foreground">
        <input
          type="checkbox"
          checked={completed}
          disabled={pendingDayId === day.id}
          onChange={() => onComplete(day, completed)}
          className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
        />
        {completionLabel}
      </label>
    </div>
  );
}