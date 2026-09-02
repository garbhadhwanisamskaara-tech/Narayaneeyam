import { PeacockFeatherIcon } from "@/components/icons/PeacockFeatherIcon";
import type { GardenTile } from "@/hooks/useSessionGarden";

interface Props {
  /** The same personal tiles the garden renders with. */
  tiles: Map<number, GardenTile>;
}

/**
 * A light celebratory strip: one peacock feather per dashakam the current
 * user has personally completed in this parayanam.
 */
export function FeatherCollection({ tiles }: Props) {
  const earned = Array.from(tiles.values()).filter((t) => t.mineDone > 0).length;
  if (earned === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-peacock">
      <p className="font-sans text-sm text-muted-foreground">
        {earned === 1 ? "1 dashakam" : `${earned} dashakams`} completed — may Guruvayurappan bless your journey.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {Array.from({ length: earned }, (_, i) => (
          <PeacockFeatherIcon key={i} className="h-6 w-6 text-secondary" />
        ))}
      </div>
    </div>
  );
}

export default FeatherCollection;
