import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Journey } from "@/hooks/useJourneys";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JourneyCardProps {
  journey: Journey;
}

export default function JourneyCard({ journey }: JourneyCardProps) {
  return (
    <Link key={journey.id} to={`/journeys/${journey.slug}`} className="block">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-peacock transition-transform hover:scale-[1.01]">
        {journey.cover_image && (
          <img src={journey.cover_image} alt="" className="h-36 w-full object-cover" loading="lazy" />
        )}
        <div className="p-5">
          <h2 className="font-display text-lg font-bold text-foreground">{journey.title}</h2>
          {journey.short_description && (
            <p className="mt-1 font-sans text-sm text-muted-foreground">{journey.short_description}</p>
          )}
          <p className="mt-2 font-sans text-xs text-muted-foreground">{journey.duration_days} days</p>
          <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 w-full")}>
            View journey
            <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}