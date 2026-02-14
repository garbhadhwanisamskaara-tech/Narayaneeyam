import { useState, useRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import manibellImg from "@/assets/manibell.jpg";

interface VerseIconsProps {
  bell?: boolean;
  prasadam?: string;
}

export default function VerseIcons({ bell, prasadam }: VerseIconsProps) {
  const bellAudioRef = useRef<HTMLAudioElement | null>(null);

  const playBellSound = () => {
    // Use a simple bell tone via Web Audio API
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 830;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.5);
    } catch {}
  };

  if (!bell && !prasadam) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        {bell && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onMouseEnter={playBellSound}
                className="h-8 w-8 rounded-full overflow-hidden border border-gold/40 hover:border-gold transition-colors hover:scale-110 transform"
              >
                <img
                  src={manibellImg}
                  alt="Temple Bell"
                  className="h-full w-full object-cover"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-sans text-xs">🔔 Ring bell here</p>
            </TooltipContent>
          </Tooltip>
        )}
        {prasadam && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-card text-lg cursor-default hover:border-gold hover:scale-110 transform transition-all">
                🪷
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-sans text-xs">Prasadam: {prasadam}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
