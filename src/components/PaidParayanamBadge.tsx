import { forwardRef } from "react";
import { Star } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePaidParayanamBadge } from "@/hooks/usePaidParayanamBadge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const StarBadge = forwardRef<
  HTMLSpanElement | HTMLButtonElement,
  { label: string; interactive?: boolean } & React.HTMLAttributes<HTMLElement>
>(({ label, interactive = false, className, ...props }, ref) => {
  const badgeClassName =
    "flex h-4 w-4 items-center justify-center rounded-full border border-peacock-dark bg-secondary text-secondary-foreground shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

  if (!interactive) {
    return (
      <span
        ref={ref as React.Ref<HTMLSpanElement>}
        role="img"
        aria-label={label}
        tabIndex={0}
        className={badgeClassName}
        {...props}
      >
        <Star className="h-2.5 w-2.5" fill="currentColor" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <button
      type="button"
      ref={ref as React.Ref<HTMLButtonElement>}
      aria-label={label}
      className={badgeClassName}
      {...props}
    >
      <Star className="h-2.5 w-2.5" fill="currentColor" strokeWidth={2.5} />
    </button>
  );
});

StarBadge.displayName = "StarBadge";

export default function PaidParayanamBadge() {
  const parayanamNames = usePaidParayanamBadge();
  const isMobile = useIsMobile();

  if (!parayanamNames.length) return null;

  const label = `Approved for ${parayanamNames.join(", ")}`;

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <StarBadge label={label} interactive />
        </PopoverTrigger>
        <PopoverContent side="bottom" align="center" className="w-auto max-w-[min(18rem,calc(100vw-2rem))] px-3 py-2">
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
        <TooltipContent side="bottom" align="center" className="max-w-[20rem]">
          <p className="font-sans text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
