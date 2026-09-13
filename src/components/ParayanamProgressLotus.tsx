import Lotus from "@/components/Lotus";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ParayanamProgressLotusProps {
  completed: number;
  total: number;
  className?: string;
}

export default function ParayanamProgressLotus({
  completed,
  total,
  className = "h-8 w-8",
}: ParayanamProgressLotusProps) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (completed / total) * 100)) : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`${className} inline-flex shrink-0 cursor-help`}
          tabIndex={0}
          aria-label={`Blooms as you progress through this parayanam — ${completed} of ${total} dashakams.`}
        >
          <Lotus percent={percent} petalColor="gold" />
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 font-sans text-xs">
        Blooms as you progress through this parayanam — {completed} of {total} dashakams.
      </TooltipContent>
    </Tooltip>
  );
}