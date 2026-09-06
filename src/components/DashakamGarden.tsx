import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getDashakamName, useDashakamNames } from "@/hooks/useDashakam";
import { useLanguagePrefs } from "@/hooks/useLanguagePrefs";
import { cn } from "@/lib/utils";

export interface GardenTileInfo {
  done: number;
  total: number;
  canTap: boolean;
  scheduled_date?: string | null;
}

interface Props {
  /** Bloom percent (0–100) keyed by dashakam number. Missing = closed bud. */
  blooms: Map<number, number>;
  /** Dashakams actually in this parayanam. Defaults to all 100. */
  dashakamNumbers?: number[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  /** Per-dashakam completion fractions; enables the "x/y" label. */
  tiles?: Map<number, GardenTileInfo>;
  /** Tap-to-complete handler. Tiles are only tappable when tiles[n].canTap. */
  onTapDashakam?: (dashakamNo: number) => void;
  /** Dashakam currently being written. */
  pendingDashakam?: number | null;
}

function formatShortDate(date: string | null | undefined) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * A single lotus whose petals open with bloom intensity.
 * 0% = closed bud, 100% = fully bloomed.
 */
function Lotus({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const spread = 6 + p * 26;
  const petalLen = 5 + p * 5;
  const opacity = 0.35 + p * 0.65;

  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
      {[-2, -1, 0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="16"
          cy={20 - petalLen}
          rx={2.6 + p * 1.2}
          ry={petalLen}
          transform={`rotate(${i * spread} 16 21)`}
          fill="hsl(var(--lotus-petal))"
          opacity={opacity}
        />
      ))}
      <circle cx="16" cy="21" r={2 + p * 1.6} fill="hsl(var(--lotus-heart))" opacity={0.5 + p * 0.5} />
      <ellipse cx="16" cy="25.5" rx={7 + p * 2} ry="2" fill="hsl(var(--lotus-leaf))" opacity="0.55" />
    </svg>
  );
}

function GardenCell({
  num,
  percent,
  tile,
  onTap,
  pending,
}: {
  num: number;
  percent: number;
  tile?: GardenTileInfo;
  onTap?: (n: number) => void;
  pending?: boolean;
}) {
  const clickable = !!tile?.canTap && !!onTap;
  const label = tile && tile.total > 0 ? `${tile.done}/${tile.total}` : null;
  const dateLabel = tile?.scheduled_date ? formatShortDate(tile.scheduled_date) : null;
  return (
    <button
      type="button"
      disabled={!clickable || pending}
      onClick={clickable ? () => onTap?.(num) : undefined}
      title={`${num}. ${getDashakamName(num)} — ${Math.round(percent)}% bloomed${
        label ? ` (${label} done)` : ""
      }${dateLabel ? ` — ${dateLabel}` : ""}${clickable ? " — tap to mark done" : ""}`}
      aria-label={`Dashakam ${num}${label ? `, ${label} done` : ""}${
        dateLabel ? `, ${dateLabel}` : ""
      }${clickable ? ", tap to mark complete" : ""}`}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-0.5 transition-transform",
        clickable ? "cursor-pointer hover:scale-110 hover:border-primary/50" : "cursor-default hover:scale-110",
        pending && "opacity-60"
      )}
    >
      <span className="block w-full flex-1">
        <Lotus percent={percent} />
      </span>
      <span className="font-display text-[9px] font-semibold leading-none text-muted-foreground">{num}</span>
      {dateLabel && (
        <span className="mt-0.5 font-sans text-[8px] leading-none text-muted-foreground">{dateLabel}</span>
      )}
      {label && (
        <span className="mt-0.5 font-sans text-[8px] leading-none text-muted-foreground">{label}</span>
      )}
    </button>
  );
}


export default function DashakamGarden({
  blooms,
  dashakamNumbers,
  title = "My Dashakam Garden",
  subtitle,
  loading,
  tiles,
  onTapDashakam,
  pendingDashakam,
}: Props) {
  const interactive = !!tiles;
  const [expanded, setExpanded] = useState(false);
  const showGrid = interactive || expanded;

  const numbers =
    dashakamNumbers && dashakamNumbers.length > 0
      ? [...dashakamNumbers].sort((a, b) => a - b)
      : Array.from({ length: 100 }, (_, i) => i + 1);
  const total = numbers.length;


  const bloomed = numbers.filter((n) => (blooms.get(n) ?? 0) >= 100).length;

  // The next dashakam not yet fully bloomed — what the compact view leads with.
  let nextNum = numbers[0];
  for (const n of numbers) {
    nextNum = n;
    if ((blooms.get(n) ?? 0) < 100) break;
  }
  const nextPercent = blooms.get(nextNum) ?? 0;

  // Most recently bloomed, for the compact strip — highest dashakam numbers
  // with a bloom recorded, newest-first. Bloom order isn't dated here, so
  // this is a reasonable proxy: recently-worked-on numbers tend to cluster
  // near the current position.
  const recent = Array.from(blooms.entries())
    .filter(([num, pct]) => pct >= 100 && numbers.includes(num))
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
          <p className="font-sans text-sm text-muted-foreground">
            {loading ? "Tending the garden…" : (subtitle ?? `${bloomed} of ${total} lotuses in full bloom`)}
          </p>
        </div>
      </div>

      {!showGrid ? (
        <div className="flex flex-col items-center gap-4 py-2 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
          {/* The lotus you're working toward, shown large */}
          <div className="flex flex-col items-center gap-2">
            <div className="h-20 w-20 rounded-xl border border-border/60 bg-muted/40 p-1.5">
              <Lotus percent={nextPercent} />
            </div>
            <p className="text-center font-sans text-xs text-muted-foreground">
              {nextPercent >= 100 ? "All blooming" : `Dashakam ${nextNum}`}
            </p>
          </div>

          {/* Recently bloomed strip */}
          {recent.length > 0 && (
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="font-sans text-xs text-muted-foreground">Recently bloomed</p>
              <div className="flex gap-1.5">
                {recent.map(([num, pct]) => (
                  <div key={num} className="h-10 w-10 rounded-lg border border-border/60 bg-muted/40 p-1">
                    <Lotus percent={pct} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 sm:gap-2">
          {numbers.map((num) => (
            <GardenCell
              key={num}
              num={num}
              percent={blooms.get(num) ?? 0}
              tile={tiles?.get(num)}
              onTap={onTapDashakam}
              pending={pendingDashakam === num}
            />
          ))}
        </div>
      )}

      {interactive ? (
        <p className="mt-3 text-center font-sans text-xs text-muted-foreground">
          Tap your lotus once you've chanted that dashakam — tap again to undo. The number shows how many in the
          group have finished it.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 font-sans text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View full Garden
            </>
          )}
        </button>
      )}
    </div>
  );
}

