import { SkipBack, SkipForward, FastForward, X } from "lucide-react";
import type { PlaylistItem } from "@/hooks/usePlaylist";
import { sampleDashakams } from "@/data/narayaneeyam";

interface PlaylistBarProps {
  items: PlaylistItem[];
  currentIndex: number;
  currentLoop: number;
  totalCompleted: number;
  onPrevDashakam: () => void;
  onNextDashakam: () => void;
  onSkipLoop: () => void;
  onExit: () => void;
}

export default function PlaylistBar({
  items,
  currentIndex,
  currentLoop,
  totalCompleted,
  onPrevDashakam,
  onNextDashakam,
  onSkipLoop,
  onExit,
}: PlaylistBarProps) {
  const current = items[currentIndex];
  if (!current) return null;

  const name = sampleDashakams.find(d => d.id === current.dashakam_no)?.title_english || `Dashakam ${current.dashakam_no}`;

  return (
    <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-2 mb-4 flex items-center gap-3 flex-wrap">
      <span className="text-xs font-sans text-secondary font-semibold">📋 Playlist</span>
      <span className="text-xs font-sans text-foreground">
        D{current.dashakam_no}: {name}
      </span>
      {current.loops > 1 && (
        <span className="text-[10px] font-sans text-muted-foreground">
          Loop {currentLoop + 1}/{current.loops}
        </span>
      )}
      <span className="text-[10px] font-sans text-muted-foreground">
        · {totalCompleted}/{items.length} complete
      </span>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        <button onClick={onPrevDashakam} disabled={currentIndex <= 0} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30" title="Previous dashakam">
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        {current.loops > 1 && (
          <button onClick={onSkipLoop} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Skip remaining loops">
            <FastForward className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={onNextDashakam} disabled={currentIndex >= items.length - 1} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30" title="Next dashakam">
          <SkipForward className="h-3.5 w-3.5" />
        </button>
        <button onClick={onExit} className="p-1 rounded hover:bg-destructive/10 transition-colors text-destructive/60 hover:text-destructive ml-1" title="Exit playlist">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
