import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useJourneys } from "@/hooks/useJourneys";

export default function JourneyListPage() {
  const { journeys, isLoading, error } = useJourneys();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 font-sans text-sm text-destructive">
        Could not load journeys right now. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-foreground">Guided Journeys</h1>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Step-by-step paths through the app, at your own pace.
      </p>

      {journeys.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center font-sans text-sm text-muted-foreground">
          No journeys open right now — check back soon.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {journeys.map((journey) => (
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
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
