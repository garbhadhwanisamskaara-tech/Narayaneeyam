import { Loader2 } from "lucide-react";
import { useJourneys } from "@/hooks/useJourneys";
import JourneyCard from "@/components/JourneyCard";

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
            <JourneyCard key={journey.id} journey={journey} />
          ))}
        </div>
      )}
    </div>
  );
}
