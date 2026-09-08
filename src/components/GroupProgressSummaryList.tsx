import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { useMyDashakamQueue, type SourceSummary } from "@/hooks/useMyDashakamQueue";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";

function Row({
  summary,
  onComplete,
  pendingId,
}: {
  summary: SourceSummary;
  onComplete: (scheduleId: string) => void;
  pendingId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const hasPending = summary.pending > 0;

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => hasPending && setOpen((o) => !o)}
        disabled={!hasPending}
        className="flex w-full items-center justify-between gap-2 py-2 text-left disabled:cursor-default"
      >
        <span className="min-w-0 truncate font-sans text-sm text-foreground">
          <span className="font-semibold">{summary.sourceName}</span>
          <span className="text-muted-foreground">
            {" "}· Completed {summary.completed}
            {" "}· Pending {summary.pending}
          </span>
        </span>
        {hasPending && (
          <span className="shrink-0">
            {open ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        )}
      </button>
      {open && hasPending && (
        <div className="overflow-x-auto pb-2">
          <div className="flex w-max flex-nowrap gap-2">
            {summary.pendingItems.map((item) => (
              <button
                key={item.scheduleId}
                onClick={() => onComplete(item.scheduleId)}
                disabled={pendingId === item.scheduleId}
                aria-label={`Mark Dashakam ${item.dashakamNo} as chanted`}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-sans text-sm text-foreground transition-colors hover:bg-primary/10 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5 text-primary" />
                {item.dashakamNo}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Per-group progress summary on the Groups page — each source collapsed by
 * default, expanding to its tick-to-complete chips.
 */
export default function GroupProgressSummaryList({
  card = false,
}: {
  /** Wrap in a card surface — only rendered when there is something to show. */
  card?: boolean;
}) {
  const { sourceSummaries, removeItem } = useMyDashakamQueue();
  const { markDashakamComplete, pendingId } = useCompleteDashakam();

  const complete = (scheduleId: string) => {
    removeItem(scheduleId);
    void markDashakamComplete(scheduleId);
  };

  if (!sourceSummaries.length) return null;

  return (
    <div
      className={
        card
          ? "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-peacock"
          : "space-y-4"
      }
    >
      <div>
        <h4 className="font-display text-sm font-semibold text-foreground">My Parayanam Progress</h4>
        <div className="mt-1">
          {sourceSummaries.map((s) => (
            <Row key={s.sourceName} summary={s} onComplete={complete} pendingId={pendingId} />
          ))}
        </div>
      </div>
    </div>
  );
}
