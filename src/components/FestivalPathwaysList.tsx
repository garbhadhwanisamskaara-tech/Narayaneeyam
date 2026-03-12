import { ChevronRight, Sparkles } from "lucide-react";
import type { FestivalPathway } from "@/data/devotionPathways";

interface Props {
  festivals: FestivalPathway[];
  onSelect: (festivalId: string) => void;
}

export default function FestivalPathwaysList({ festivals, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {festivals.map((f) => (
        <button
          key={f.id}
          onClick={() => onSelect(f.id)}
          className="w-full flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15">
            <Sparkles className="h-5 w-5 text-secondary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground font-sans">
              {f.festival_name}
            </p>
            <p className="text-xs text-muted-foreground font-sans">
              {f.dashakams.length} Dashakam{f.dashakams.length > 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}
