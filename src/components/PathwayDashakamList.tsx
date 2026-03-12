import { ChevronRight } from "lucide-react";
import type { Dashakam } from "@/data/narayaneeyam";

interface Props {
  dashakams: number[];
  allDashakams: Dashakam[];
  onSelect: (dashakamNumber: number) => void;
}

export default function PathwayDashakamList({ dashakams, allDashakams, onSelect }: Props) {
  return (
    <div className="space-y-2">
      {dashakams.map((num) => {
        const d = allDashakams.find((dd) => dd.id === num);
        return (
          <button
            key={num}
            onClick={() => onSelect(num)}
            className="w-full flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary font-sans">
              {num}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground font-sans truncate">
                Dashakam {num}
              </p>
              {d && (
                <p className="text-xs text-muted-foreground font-sans truncate">
                  {d.title_english}
                </p>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        );
      })}
    </div>
  );
}
