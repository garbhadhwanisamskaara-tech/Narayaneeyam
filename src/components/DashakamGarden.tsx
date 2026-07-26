import { getDashakamName } from "@/hooks/useDashakam";

interface Props {
  /** Bloom percent (0–100) keyed by dashakam number. Missing = closed bud. */
  blooms: Map<number, number>;
  title?: string;
  subtitle?: string;
  loading?: boolean;
}

/**
 * A single lotus whose petals open with bloom intensity.
 * 0% = closed bud, 100% = fully bloomed.
 */
function Lotus({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  // Petals spread outward and the bloom brightens as p grows
  const spread = 6 + p * 26; // degrees each side petal tilts
  const petalLen = 5 + p * 5;
  const opacity = 0.35 + p * 0.65;

  return (
    <svg viewBox="0 0 32 32" className="h-full w-full" aria-hidden="true">
      {/* outer petals */}
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
      {/* heart of the lotus */}
      <circle cx="16" cy="21" r={2 + p * 1.6} fill="hsl(var(--lotus-heart))" opacity={0.5 + p * 0.5} />
      {/* leaf base */}
      <ellipse cx="16" cy="25.5" rx={7 + p * 2} ry="2" fill="hsl(var(--lotus-leaf))" opacity="0.55" />
    </svg>
  );
}

export default function DashakamGarden({ blooms, title = "Dashakam Garden", subtitle, loading }: Props) {
  const bloomed = Array.from(blooms.values()).filter((v) => v >= 100).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
        <p className="font-sans text-sm text-muted-foreground">
          {loading ? "Tending the garden…" : subtitle ?? `${bloomed} of 100 lotuses in full bloom`}
        </p>
      </div>

      <div className="grid grid-cols-10 gap-1 sm:gap-2">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
          const pct = blooms.get(num) ?? 0;
          return (
            <div
              key={num}
              title={`${num}. ${getDashakamName(num)} — ${Math.round(pct)}% bloomed`}
              className="relative aspect-square rounded-lg border border-border/60 bg-muted/40 p-0.5 transition-transform hover:scale-110"
            >
              <Lotus percent={pct} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
