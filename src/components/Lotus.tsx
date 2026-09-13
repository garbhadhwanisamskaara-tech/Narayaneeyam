interface LotusProps {
  percent: number;
  className?: string;
  petalColor?: "lotus" | "gold";
}

/** A single lotus whose petals open with bloom intensity. */
export default function Lotus({ percent, className = "h-full w-full", petalColor = "lotus" }: LotusProps) {
  const p = Math.max(0, Math.min(100, percent)) / 100;
  const spread = 6 + p * 26;
  const petalLen = 5 + p * 5;
  const opacity = 0.35 + p * 0.65;
  const petalFill = petalColor === "gold" ? "hsl(var(--secondary))" : "hsl(var(--lotus-petal))";

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {[-2, -1, 0, 1, 2].map((i) => (
        <ellipse
          key={i}
          cx="16"
          cy={20 - petalLen}
          rx={2.6 + p * 1.2}
          ry={petalLen}
          transform={`rotate(${i * spread} 16 21)`}
          fill={petalFill}
          opacity={opacity}
        />
      ))}
      <circle cx="16" cy="21" r={2 + p * 1.6} fill="hsl(var(--lotus-heart))" opacity={0.5 + p * 0.5} />
      <ellipse cx="16" cy="25.5" rx={7 + p * 2} ry="2" fill="hsl(var(--lotus-leaf))" opacity="0.55" />
    </svg>
  );
}