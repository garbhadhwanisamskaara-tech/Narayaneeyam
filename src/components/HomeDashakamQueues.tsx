import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { useMyDashakamQueue, type QueueRow } from "@/hooks/useMyDashakamQueue";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";

function shortDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

interface SectionProps {
  title: string;
  count?: number;
  rows: QueueRow[];
  showDate: boolean;
  onComplete: (scheduleId: string) => void;
  pendingId: string | null;
  footer?: React.ReactNode;
}

function QueueSection({ title, count, rows, showDate, onComplete, pendingId, footer }: SectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-xl border border-border bg-card shadow-md overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <h3 className="font-display text-base font-semibold text-foreground">
          {title}
          {typeof count === "number" && (
            <span className="text-muted-foreground font-sans font-normal"> · {count}</span>
          )}
        </h3>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3">
          <div className="max-h-[186px] overflow-y-auto divide-y divide-border">
            {rows.map((row) => (
              <div key={row.key} className="flex items-start gap-3 py-2">
                <div className="w-[118px] shrink-0">
                  <p className="text-sm font-semibold text-foreground font-sans break-words">
                    {row.sourceName}
                  </p>
                  {showDate && row.scheduledDate && (
                    <p className="text-xs text-muted-foreground font-sans">
                      {shortDate(row.scheduledDate)}
                    </p>
                  )}
                </div>
                <div className="min-w-0 flex-1 overflow-x-auto">
                  <div className="flex flex-nowrap gap-2 w-max pb-1">
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
              </div>
            ))}
          </div>
          {footer}
        </div>
      )}
    </div>
  );
}

export default function HomeDashakamQueues() {
  const { todayRows, pendingRows, pendingCount, removeItem } = useMyDashakamQueue();
  const { markDashakamComplete, pendingId } = useCompleteDashakam();

  const complete = (scheduleId: string) => {
    removeItem(scheduleId);
    void markDashakamComplete(scheduleId);
  };

  if (!todayRows.length && !pendingRows.length) return null;

  return (
    <div className="space-y-4">
      {todayRows.length > 0 && (
        <QueueSection
          title="Today's Dashakams"
          rows={todayRows}
          showDate={false}
          onComplete={complete}
          pendingId={pendingId}
        />
      )}
      {pendingRows.length > 0 && (
        <QueueSection
          title="Pending Dashakams"
          count={pendingCount}
          rows={pendingRows}
          showDate
          onComplete={complete}
          pendingId={pendingId}
          footer={
            <Link
              to="/groups"
              className="mt-2 inline-block font-sans text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              See all details in My Groups →
            </Link>
          }
        />
      )}
    </div>
  );
}
