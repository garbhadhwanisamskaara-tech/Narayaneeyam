import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useJourney } from "@/hooks/useJourney";
import { useJourneyEnrollment } from "@/hooks/useJourneyEnrollment";
import { useJourneyProgress } from "@/hooks/useJourneyProgress";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import JourneyProgressGarden from "@/components/JourneyProgressGarden";
import { resolveJourneyDayAction } from "@/lib/journeyActions";

export default function JourneyDashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { journey, days, defaultRun, isLoading: journeyLoading, error: journeyError } = useJourney(slug);
  const {
    enrollment,
    currentDay,
    isLoading: enrollmentLoading,
    isPending: enrollmentPending,
    error: enrollmentError,
    join,
    leave,
    resume,
  } = useJourneyEnrollment(journey?.id, journey?.duration_days);
  const {
    progress,
    pendingDayId,
    error: progressError,
    openDay,
    markDayComplete,
    unmarkDayComplete,
  } = useJourneyProgress(enrollment?.id, journey?.id);

  useEffect(() => {
    if (journey) track("journey_viewed", { journey_id: journey.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey?.id]);

  // Fire-and-forget: record today's day as opened as soon as we know which one it is.
  useEffect(() => {
    if (!currentDay || !days.length) return;
    const todayDay = days.find((d) => d.day_number === currentDay);
    if (todayDay) openDay(todayDay.id);
  }, [currentDay, days, openDay]);

  if (journeyLoading || (!enrollment && enrollmentLoading)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (journeyError || !journey) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="font-sans text-sm text-muted-foreground">
          Could not find this journey. It may have been unpublished.
        </p>
      </div>
    );
  }

  const isCompleted = enrollment?.status === "COMPLETED";
  const isLeft = enrollment?.status === "LEFT";

  const handleJoin = async () => {
    if (!defaultRun) return;
    await join(defaultRun.id);
  };

  const todayDay = currentDay ? days.find((d) => d.day_number === currentDay) : null;
  const isLastDay = todayDay?.day_number === journey.duration_days;
  const todayProgress = todayDay ? progress.find((p) => p.journey_day_id === todayDay.id) : undefined;
  const todayDone = todayProgress?.completion_status === "COMPLETED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{journey.title}</h1>
        {journey.short_description && (
          <p className="mt-1 font-sans text-sm text-muted-foreground">{journey.short_description}</p>
        )}
      </div>

      {(enrollmentError || progressError) && (
        <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 font-sans text-xs text-destructive">
          {enrollmentError || progressError}
        </p>
      )}

      {/* No auth: sending to /auth is handled by the route guard elsewhere in
          the app (same pattern as every other authenticated page) -- this
          page assumes `user` exists once it renders past the loading state. */}
      {!user ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">Please sign in to join this journey.</p>
      ) : !enrollment ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
          <p className="font-sans text-sm text-muted-foreground">
            {journey.description ?? `A ${journey.duration_days}-day guided path through the app.`}
          </p>
          <button
            type="button"
            onClick={() => void handleJoin()}
            disabled={enrollmentPending || !defaultRun}
            className="mt-4 w-full rounded-lg bg-primary py-3 font-sans text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {enrollmentPending ? "Joining…" : "Start this journey"}
          </button>
        </div>
      ) : isLeft ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
          <p className="font-sans text-sm text-muted-foreground">You stepped away from this journey.</p>
          <button
            type="button"
            onClick={() => void resume()}
            disabled={enrollmentPending}
            className="mt-4 w-full rounded-lg bg-primary py-3 font-sans text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {enrollmentPending ? "Resuming…" : "Resume journey"}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
            <JourneyProgressGarden
              progressVisualType={journey.progress_visual_type}
              days={days}
              progress={progress}
            />
          </div>

          {isCompleted ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center shadow-peacock">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-2 font-display text-lg font-bold text-foreground">Journey complete</p>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Every one of the {journey.duration_days} days is done.
              </p>
            </div>
          ) : todayDay ? (
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
                Day {todayDay.day_number} of {journey.duration_days}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-foreground">{todayDay.title}</h2>
              {todayDay.hook && <p className="mt-2 font-sans text-sm text-muted-foreground">{todayDay.hook}</p>}
              {todayDay.task_instruction && (
                <p className="mt-3 font-sans text-sm text-foreground">{todayDay.task_instruction}</p>
              )}

              {todayDay.action_type !== "NONE" && (
                <button
                  type="button"
                  onClick={() => resolveJourneyDayAction(todayDay, navigate)}
                  className="mt-4 w-full rounded-lg bg-primary py-3 font-sans text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  {todayDay.cta_label || "Start"}
                </button>
              )}

              {todayDay.reflection_text && (
                <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 font-sans text-sm text-muted-foreground">
                  {todayDay.reflection_text}
                </p>
              )}

              {/* The only control that writes completion -- separate from the
                  garden visual above, so nothing blooms by accident (§15). */}
              <label className="mt-5 flex items-center gap-2 font-sans text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={todayDone}
                  disabled={pendingDayId === todayDay.id}
                  onChange={() =>
                    void (todayDone
                      ? unmarkDayComplete(todayDay.id)
                      : markDayComplete(todayDay.id, isLastDay))
                  }
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
                />
                Mark today's journey complete
              </label>
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Completed</p>
              <ul className="mt-2 space-y-1">
                {days
                  .filter((d) => progress.some((p) => p.journey_day_id === d.id && p.completion_status === "COMPLETED"))
                  .map((d) => (
                    <li key={d.id} className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Day {d.day_number}: {d.title}
                    </li>
                  ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Upcoming</p>
              <ul className={cn("mt-2 space-y-1")}>
                {currentDay &&
                  days
                    .filter((d) => d.day_number > currentDay)
                    .map((d) => (
                      <li key={d.id} className="flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" /> Day {d.day_number}: {d.title}
                      </li>
                    ))}
              </ul>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void leave()}
            disabled={enrollmentPending}
            className="mt-8 w-full font-sans text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Leave this journey
          </button>
        </>
      )}
    </div>
  );
}
