import { SkipBack, SkipForward, FastForward, X } from "lucide-react";
import type { PlaylistItem } from "@/hooks/usePlaylist";
import { getDashakamName } from "@/hooks/useDashakam";

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

  const name = getDashakamName(current.dashakam_no);

  return (
    <div className="mb-4 rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-sans font-semibold text-secondary">
            Playlist {currentIndex + 1}/{items.length}
          </span>
          <span className="text-xs font-sans text-foreground truncate">
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground font-sans">
            Loop {currentLoop + 1}/{current.loops}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrevDashakam} disabled={currentIndex === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <SkipBack className="h-4 w-4" />
          </button>
          <button onClick={onSkipLoop} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Skip to next dashakam">
            <FastForward className="h-4 w-4" />
          </button>
          <button onClick={onNextDashakam} disabled={currentIndex >= items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
            <SkipForward className="h-4 w-4" />
          </button>
          <button onClick={onExit} className="p-1 text-destructive/60 hover:text-destructive transition-colors" title="Exit playlist">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
