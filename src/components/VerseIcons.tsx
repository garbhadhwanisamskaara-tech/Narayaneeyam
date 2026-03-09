import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import manibellImg from "@/assets/manibell.jpg";
import { playBellAudio } from "@/lib/bellAudio";

interface VerseIconsProps {
  bell?: boolean;
  prasadam?: string;
}

export default function VerseIcons({ bell, prasadam }: VerseIconsProps) {
  if (!bell && !prasadam) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        {bell && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onMouseEnter={() => playBellAudio()}
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
                🍚
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
