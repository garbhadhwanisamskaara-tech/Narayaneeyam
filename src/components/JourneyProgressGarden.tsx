import { cn } from "@/lib/utils";
import Lotus from "@/components/Lotus";
import type { JourneyDay } from "@/hooks/useJourney";
import type { JourneyProgress } from "@/hooks/useJourneyProgress";

interface Props {
  progressVisualType: "LOTUS_CONCENTRIC_RINGS" | "LOTUS_GARDEN" | "FEATHER" | "SIMPLE_PROGRESS";
  days: JourneyDay[];
  progress: JourneyProgress[];
  /** Highest unlocked day number; tiles at or below it that aren't done become tappable. */
  unlockedDay?: number;
  selectedDayId?: string | null;
  onSelectDay?: (day: JourneyDay) => void;
}

type TileState = "done" | "open" | "locked";
function tileState(day: JourneyDay, progress: JourneyProgress[], unlockedDay?: number): TileState {
  if (isDone(day, progress)) return "done";
  if (unlockedDay && day.day_number <= unlockedDay) return "open";
  return "locked";
}

function DayTile({ day, progress, unlockedDay, selectedDayId, onSelectDay, compact }: {
  day: JourneyDay; progress: JourneyProgress[]; unlockedDay?: number;
  selectedDayId?: string | null; onSelectDay?: (d: JourneyDay) => void; compact?: boolean;
}) {
  const state = tileState(day, progress, unlockedDay);
  const tappable = state === "open" && !!onSelectDay;
  const selected = selectedDayId === day.id;
  const title = `Day ${day.day_number}: ${day.title}${
    state === "done" ? " — complete" : state === "open" ? " — open, tap to view" : ""
  }`;
  const className = cn(
    "flex aspect-square flex-col items-center justify-center rounded-lg border p-0.5",
    state === "open"
      ? "border-dashed border-secondary bg-card transition-colors hover:bg-secondary/10 cursor-pointer"
      : "border-border/60 bg-muted/40",
    selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
    compact && "w-9 sm:w-10"
  );
  const inner = (
    <>
      <span className={cn("block w-full flex-1", state === "open" && "opacity-60")}>
        <Lotus percent={state === "done" ? 100 : 0} />
      </span>
      <span className={cn(
        "font-display text-[9px] font-semibold leading-none",
        state === "open" ? "text-secondary" : "text-muted-foreground"
      )}>
        {day.day_number}
      </span>
    </>
  );
  if (!tappable) return <div title={title} className={className}>{inner}</div>;
  return (
    <button type="button" title={title} aria-label={title} aria-pressed={selected}
      onClick={() => onSelectDay!(day)} className={className}>
      {inner}
    </button>
  );
}

function isDone(day: JourneyDay, progress: JourneyProgress[]): boolean {
  return progress.some((p) => p.journey_day_id === day.id && p.completion_status === "COMPLETED");
}

/**
 * §13: for LOTUS_CONCENTRIC_RINGS, days group into weekly rings of up to 7,
 * week 1 innermost growing outward. Each ring's own percent is the fraction
 * of that week's days completed (Lotus.tsx takes one percent per flower, so
 * a ring's bloom is one lotus per week, not one per day). The shared center
 * stays an empty outline until every ring is fully bloomed, then reveals a
 * single gold circle -- one flourish for finishing the whole journey, not
 * one per week.
 */
function ConcentricRings({ days, progress, ...tileProps }: Omit<Props, "progressVisualType">) {
  const weekCount = Math.ceil(days.length / 7);
  const rings = Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);
    const doneCount = weekDays.filter((d) => isDone(d, progress)).length;
    const percent = weekDays.length ? (doneCount / weekDays.length) * 100 : 0;
    return { weekIndex, percent, doneCount, total: weekDays.length };
  });

  const allBloomed = rings.length > 0 && rings.every((r) => r.percent >= 100);
  // Innermost (week 1) smallest, growing outward.
  const sizeStep = 26;
  const baseSize = 44;
  const outerSize = baseSize + Math.max(0, weekCount - 1) * sizeStep;

  return (
    <div>
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ height: outerSize, width: outerSize }}
    >
      {rings
        .slice()
        .reverse()
        .map((ring) => {
          const size = baseSize + ring.weekIndex * sizeStep;
          return (
            <div
              key={ring.weekIndex}
              title={`Week ${ring.weekIndex + 1} — ${ring.doneCount} of ${ring.total} days complete`}
              className="absolute flex items-center justify-center rounded-full border border-border/60"
              style={{ height: size, width: size }}
            >
              <span className="absolute inset-0 p-0.5">
                <Lotus percent={ring.percent} />
              </span>
            </div>
          );
        })}
      <span
        className={cn(
          "absolute h-3 w-3 rounded-full border",
          allBloomed ? "border-secondary bg-secondary" : "border-border bg-transparent"
        )}
        aria-hidden="true"
      />
    </div>
    {tileProps.onSelectDay && (
      <div className="mt-4 flex flex-wrap justify-center gap-1 sm:gap-2">
        {days.map((day) => (
          <DayTile key={day.id} day={day} progress={progress} compact {...tileProps} />
        ))}
      </div>
    )}
    </div>
  );
}

/** Flat per-day grid, same bud/bloom visual language as DashakamGarden.tsx. */
function FlatGarden({ days, progress, ...tileProps }: Omit<Props, "progressVisualType">) {
  return (
    <div className="grid grid-cols-7 gap-1 sm:gap-2">
      {days.map((day) => (
        <DayTile key={day.id} day={day} progress={progress} {...tileProps} />
      ))}
    </div>
  );
}

/**
 * Unlocked-but-incomplete tiles may be tapped to select that day (via
 * onSelectDay); locked tiles stay inert. Nothing in this component writes to journey_progress -- it only re-renders in
 * response to a completion write made elsewhere (the day checkbox).
 */
export default function JourneyProgressGarden({ progressVisualType, ...rest }: Props) {
  if (progressVisualType === "LOTUS_CONCENTRIC_RINGS" && rest.days.length % 7 === 0) {
    return <ConcentricRings {...rest} />;
  }
  // LOTUS_GARDEN, FEATHER (no distinct visual built yet, falls back), and
  // any duration not a clean multiple of 7 (§13's stated fallback rule).
  return <FlatGarden {...rest} />;
}
