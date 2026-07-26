import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFeathers, type FeatherMode } from "@/hooks/useFeathers";
import { getDashakamName } from "@/hooks/useDashakam";

const MODES: { key: FeatherMode; label: string; color: string; ring: string; bg: string }[] = [
  {
    key: "chant",
    label: "Chant",
    color: "text-feather-chant",
    ring: "border-feather-chant/40",
    bg: "bg-feather-chant/15",
  },
  {
    key: "learn",
    label: "Learn",
    color: "text-feather-learn",
    ring: "border-feather-learn/40",
    bg: "bg-feather-learn/15",
  },
  {
    key: "podcast",
    label: "Podcast",
    color: "text-feather-podcast",
    ring: "border-feather-podcast/40",
    bg: "bg-feather-podcast/15",
  },
];

/**
 * A peacock feather (mayura pincham) -- replaces the generic lucide
 * Feather icon so the reward visual matches Krishna/Narayana
 * iconography rather than a plain bird feather.
 */
function PeacockFeather({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2c2.5 2.2 3.8 5 3.8 8 0 2.6-1.1 4.6-2.2 6.1L12 22l-1.6-5.9C9.3 14.6 8.2 12.6 8.2 10c0-3 1.3-5.8 3.8-8z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M12 3.2c2 2 3 4.4 3 6.9 0 2.2-.9 4-1.9 5.4L12 20l-1.1-4.5C9.9 14.1 9 12.3 9 10.1c0-2.5 1-4.9 3-6.9z"
        fill="currentColor"
        opacity="0.4"
      />
      <circle cx="12" cy="9.4" r="2.1" fill="currentColor" />
      <circle cx="12" cy="9.4" r="1.1" fill="hsl(var(--card))" />
      <path d="M12 15.5v6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function FeatherCell({
  num,
  has,
  color,
  bg,
  ring,
}: {
  num: number;
  has: boolean;
  color: string;
  bg: string;
  ring: string;
}) {
  return (
    <div
      title={`${num}. ${getDashakamName(num)}`}
      className={`relative aspect-square rounded-lg text-xs font-sans font-semibold flex items-center justify-center border transition-all ${
        has ? `${bg} ${ring}` : "bg-muted text-muted-foreground border-border"
      }`}
    >
      {has ? <PeacockFeather className={`h-4 w-4 ${color}`} /> : num}
    </div>
  );
}

export default function FeatherShelf() {
  const { feathers, loading } = useFeathers();
  const [mode, setMode] = useState<FeatherMode>("chant");
  const [expanded, setExpanded] = useState(false);

  const active = MODES.find((m) => m.key === mode)!;
  const collected = new Set(feathers.filter((f) => f.mode === mode).map((f) => f.dashakam_no));
  const pct = Math.round((collected.size / 100) * 100);

  let nextNum = 1;
  for (let i = 1; i <= 100; i++) {
    if (!collected.has(i)) {
      nextNum = i;
      break;
    }
    nextNum = i;
  }
  const recent = Array.from(collected)
    .sort((a, b) => b - a)
    .slice(0, 5);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <PeacockFeather className={`h-5 w-5 ${active.color}`} />
            Feather Shelf
          </h2>
          <p className="text-sm text-muted-foreground font-sans">
            {loading ? "Gathering your feathers…" : `${collected.size} of 100 feathers collected in ${active.label}`}
          </p>
        </div>
        <div className="flex gap-2">
          {MODES.map((m) => {
            const count = new Set(feathers.filter((f) => f.mode === m.key).map((f) => f.dashakam_no)).size;
            const isActive = m.key === mode;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-sans font-semibold transition-all ${
                  isActive ? `${m.bg} ${m.ring} ${m.color}` : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <PeacockFeather className={`h-3.5 w-3.5 ${isActive ? m.color : ""}`} />
                {m.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      <Progress value={pct} className="mb-5 h-3" />

      {!expanded ? (
        <div className="flex flex-col items-center gap-4 py-2 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
          {/* Next feather to earn, shown large */}
          <div className="flex flex-col items-center gap-2">
            <div className={`flex h-16 w-16 items-center justify-center rounded-xl border ${active.bg} ${active.ring}`}>
              {collected.has(nextNum) ? (
                <PeacockFeather className={`h-7 w-7 ${active.color}`} />
              ) : (
                <span className="font-sans text-sm font-semibold text-muted-foreground">{nextNum}</span>
              )}
            </div>
            <p className="text-center font-sans text-xs text-muted-foreground">
              {collected.has(nextNum) ? "All collected" : `Next: Dashakam ${nextNum}`}
            </p>
          </div>

          {recent.length > 0 && (
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="font-sans text-xs text-muted-foreground">Recently collected</p>
              <div className="flex gap-1.5">
                {recent.map((num) => (
                  <div
                    key={num}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${active.bg} ${active.ring}`}
                  >
                    <PeacockFeather className={`h-4 w-4 ${active.color}`} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => (
            <FeatherCell
              key={num}
              num={num}
              has={collected.has(num)}
              color={active.color}
              bg={active.bg}
              ring={active.ring}
            />
          ))}
        </div>
      )}

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
            <ChevronDown className="h-4 w-4" /> View full Feather Shelf
          </>
        )}
      </button>
    </div>
  );
}
