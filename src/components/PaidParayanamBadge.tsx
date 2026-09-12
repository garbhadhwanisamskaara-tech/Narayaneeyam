import { Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaidParayanamBadge } from "@/hooks/usePaidParayanamBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function StarBadge({ label, interactive = false }: { label: string; interactive?: boolean }) {
  const className =
    "flex h-4 w-4 items-center justify-center rounded-full border border-peacock-dark bg-secondary text-secondary-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  if (!interactive) {
    return (
      <span role="img" aria-label={label} tabIndex={0} className={className}>
        <Star className="h-2.5 w-2.5" fill="currentColor" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      className={className}
    >
      <Star className="h-2.5 w-2.5" fill="currentColor" strokeWidth={2.5} />
    </button>
  );
}

export default function PaidParayanamBadge() {
  const parayanamNames = usePaidParayanamBadge();
  const isMobile = useIsMobile();

  if (!parayanamNames.length) return null;

  const label = `Paid for ${parayanamNames.join(", ")}`;

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <StarBadge label={label} interactive />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" className="w-auto max-w-[min(18rem,calc(100vw-2rem))] px-3 py-2">
          <p className="font-sans text-xs text-popover-foreground">{label}</p>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <StarBadge label={label} />
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-[20rem]">
          <p className="font-sans text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}