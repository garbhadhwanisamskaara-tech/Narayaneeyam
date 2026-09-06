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

export interface GardenOccurrenceInfo {
  /** Unique key for this occurrence (schedule row id). */
  key: string;
  dashakamNo: number;
  scheduledDate?: string;
}

interface Props {
  /** Bloom percent (0–100) keyed by occurrence key. Missing = closed bud. */
  blooms: Map<string, number>;
  /** Scheduled occurrences in this parayanam. Defaults to dashakams 1–100. */
  occurrences?: GardenOccurrenceInfo[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  /** Per-occurrence completion fractions; enables the "x/y" label. */
  tiles?: Map<string, GardenTileInfo>;
  /** Tap-to-complete handler, receives the occurrence key. */
  onTapDashakam?: (occurrenceKey: string) => void;
  /** Occurrence currently being written. */
  pendingDashakam?: string | null;
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
  occurrenceKey,
  dashakamNo,
  scheduledDate,
  percent,
  tile,
  onTap,
  pending,
  lang,
}: {
  occurrenceKey: string;
  dashakamNo: number;
  scheduledDate?: string;
  percent: number;
  tile?: GardenTileInfo;
  onTap?: (key: string) => void;
  pending?: boolean;
  lang: string;
}) {
  const clickable = !!tile?.canTap && !!onTap;
  const label = tile && tile.total > 1 ? `${tile.done}/${tile.total}` : null;
  const dateLabel = formatShortDate(scheduledDate ?? tile?.scheduled_date);
  return (
    <button
      type="button"
      disabled={!clickable || pending}
      onClick={clickable ? () => onTap?.(occurrenceKey) : undefined}
      title={`${dashakamNo}. ${getDashakamName(dashakamNo, lang)} — ${Math.round(percent)}% bloomed${
        label ? ` (${label} done)` : ""
      }${dateLabel ? ` — ${dateLabel}` : ""}${clickable ? " — tap to mark done" : ""}`}
      aria-label={`Dashakam ${dashakamNo}${label ? `, ${label} done` : ""}${
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
      <span className="font-display text-[9px] font-semibold leading-none text-muted-foreground">{dashakamNo}</span>
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
  occurrences,
  title = "My Dashakam Garden",
  subtitle,
  loading,
  tiles,
  onTapDashakam,
  pendingDashakam,
}: Props) {
  const interactive = !!tiles;
  const [expanded, setExpanded] = useState(false);
  const { scriptLang } = useLanguagePrefs();
  // Subscribe to the localized dashakam list so names re-render once loaded.
  useDashakamNames(scriptLang);
  const showGrid = interactive || expanded;

  const items: GardenOccurrenceInfo[] =
    occurrences && occurrences.length > 0
      ? occurrences
      : Array.from({ length: 100 }, (_, i) => ({ key: String(i + 1), dashakamNo: i + 1 }));
  const total = items.length;

  const bloomed = items.filter((o) => (blooms.get(o.key) ?? 0) >= 100).length;

  // The next occurrence not yet fully bloomed — what the compact view leads with.
  let next = items[0];
  for (const o of items) {
    next = o;
    if ((blooms.get(o.key) ?? 0) < 100) break;
  }
  const nextPercent = next ? (blooms.get(next.key) ?? 0) : 0;

  // Most recently bloomed, newest scheduled date first.
  const recent = items
    .filter((o) => (blooms.get(o.key) ?? 0) >= 100)
    .sort((a, b) => (b.scheduledDate ?? "").localeCompare(a.scheduledDate ?? "") || b.dashakamNo - a.dashakamNo)
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
              {nextPercent >= 100 || !next ? "All blooming" : `Dashakam ${next.dashakamNo}`}
            </p>
          </div>

          {/* Recently bloomed strip */}
          {recent.length > 0 && (
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="font-sans text-xs text-muted-foreground">Recently bloomed</p>
              <div className="flex gap-1.5">
                {recent.map((o) => (
                  <div key={o.key} className="h-10 w-10 rounded-lg border border-border/60 bg-muted/40 p-1">
                    <Lotus percent={blooms.get(o.key) ?? 0} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10 sm:gap-2">
          {items.map((o) => (
            <GardenCell
              key={o.key}
              occurrenceKey={o.key}
              dashakamNo={o.dashakamNo}
              scheduledDate={o.scheduledDate}
              percent={blooms.get(o.key) ?? 0}
              tile={tiles?.get(o.key)}
              onTap={onTapDashakam}
              pending={pendingDashakam === o.key}
              lang={scriptLang}
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

