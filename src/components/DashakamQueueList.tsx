import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { useMyDashakamQueue, type QueueRow } from "@/hooks/useMyDashakamQueue";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";

function shortDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function Row({
  row,
  showDate,
  onComplete,
  pendingId,
}: {
  row: QueueRow;
  showDate: boolean;
  onComplete: (scheduleId: string) => void;
  pendingId: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left"
      >
        <span className="min-w-0 truncate font-sans text-sm text-foreground">
          <span className="font-semibold">{row.sourceName}</span>
          {showDate && row.scheduledDate && (
            <span className="text-muted-foreground"> · {shortDate(row.scheduledDate)}</span>
          )}
          <span className="text-muted-foreground"> · {row.items.length}</span>
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="overflow-x-auto pb-2">
          <div className="flex w-max flex-nowrap gap-2">
            {row.items.map((item) => (
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
 * Today's / Pending dashakams — each source (or source+date) row collapsed by
 * default, expanding to its tick-to-complete chips.
 */
export default function DashakamQueueList({
  showGroupsLink = true,
  card = false,
}: {
  showGroupsLink?: boolean;
  /** Wrap in a card surface — only rendered when there is something to show. */
  card?: boolean;
}) {
  const { todayRows, pendingRows, pendingCount, removeItem } = useMyDashakamQueue();
  const { markDashakamComplete, pendingId } = useCompleteDashakam();

  const complete = (scheduleId: string) => {
    removeItem(scheduleId);
    void markDashakamComplete(scheduleId);
  };

  if (!todayRows.length && !pendingRows.length) return null;

  return (
    <div
      className={
        card
          ? "space-y-4 rounded-2xl border border-border bg-card p-5 shadow-peacock"
          : "space-y-4"
      }
    >
      {todayRows.length > 0 && (
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">Today's Dashakams</h4>
          <div className="mt-1">
            {todayRows.map((r) => (
              <Row key={r.key} row={r} showDate={false} onComplete={complete} pendingId={pendingId} />
            ))}
          </div>
        </div>
      )}

      {pendingRows.length > 0 && (
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">
            Pending Dashakams
            <span className="font-sans font-normal text-muted-foreground"> · {pendingCount}</span>
          </h4>
          <div className="mt-1">
            {pendingRows.map((r) => (
              <Row key={r.key} row={r} showDate onComplete={complete} pendingId={pendingId} />
            ))}
          </div>
        </div>
      )}

      {showGroupsLink && (
        <Link
          to="/groups"
          className="inline-block font-sans text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          See all in My Groups →
        </Link>
      )}
    </div>
  );
}
