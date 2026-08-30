import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronDown, ChevronRight, Loader2, MessageSquare, X } from "lucide-react";
import { useMyPendingInvites } from "@/hooks/useParayanamParticipants";
import { useTicketReplyAlerts } from "@/hooks/useTicketReplyAlerts";
import { useMyDashakamQueue } from "@/hooks/useMyDashakamQueue";
import DashakamQueueList from "@/components/DashakamQueueList";
import { track } from "@/lib/analytics";

function CollapsibleItem({ summary, children }: { summary: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left"
      >
        <span className="min-w-0 truncate font-sans text-sm text-foreground">{summary}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

/**
 * Header bell. Every item is derived live from existing status fields — there is
 * no notifications table and no separate read/dismissed state.
 */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { invites, busyId, respond } = useMyPendingInvites();
  const { alerts } = useTicketReplyAlerts();
  const { todayRows, pendingRows } = useMyDashakamQueue();

  const todayCount = todayRows.reduce((n, r) => n + r.items.length, 0);

  const pendingDisplayCount = pendingRows.reduce((n, r) => n + r.items.length, 0);

  const count = invites.length + alerts.length + todayCount + pendingDisplayCount;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const answer = async (id: string, status: "confirmed" | "declined") => {
    try {
      await respond(id, status);
      if (status === "confirmed") track("parayanam_joined");
    } catch {
      /* the item stays in the list so it can be retried */
    }
  };

  const empty = invites.length === 0 && alerts.length === 0 && !todayRows.length && !pendingRows.length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${count ? ` (${count})` : ""}`}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-primary-foreground/80 transition-colors hover:text-primary-foreground"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary px-1 font-sans text-[10px] font-bold text-secondary-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-14 z-[60] max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-peacock lg:absolute lg:inset-x-auto lg:right-0 lg:top-11 lg:w-[380px]">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-foreground">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {empty ? (
            <p className="py-4 font-sans text-sm text-muted-foreground">Nothing needs your attention right now.</p>
          ) : (
            <div className="space-y-4">
              {invites.length > 0 && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground">Parayanam confirmations</h4>
                  <div className="mt-1">
                    {invites.map((i) => (
                      <CollapsibleItem
                        key={i.id}
                        summary={
                          <>
                            <span className="font-semibold">{i.group_name ?? "A parayanam"}</span>
                            <span className="text-muted-foreground"> · confirm participation</span>
                          </>
                        }
                      >
                        <p className="font-sans text-xs text-muted-foreground">
                          {i.dashakams_target ? `${i.dashakams_target} dashakams` : "Parayanam"}
                          {i.start_date ? ` · from ${i.start_date}` : ""}
                          {i.end_date ? ` to ${i.end_date}` : ""}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => void answer(i.id, "confirmed")}
                            disabled={busyId === i.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                          >
                            {busyId === i.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Confirm
                          </button>
                          <button
                            onClick={() => void answer(i.id, "declined")}
                            disabled={busyId === i.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
                          >
                            <X className="h-3.5 w-3.5" /> Decline
                          </button>
                        </div>
                      </CollapsibleItem>
                    ))}
                  </div>
                </div>
              )}

              {alerts.length > 0 && (
                <div>
                  <h4 className="font-display text-sm font-semibold text-foreground">Support ticket replies</h4>
                  <div className="mt-1">
                    {alerts.map((a) => (
                      <CollapsibleItem
                        key={a.ticketId}
                        summary={
                          <>
                            <MessageSquare className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
                            <span className="font-semibold">{a.subject}</span>
                            <span className="text-muted-foreground"> · new reply</span>
                          </>
                        }
                      >
                        <p className="line-clamp-3 font-sans text-xs text-muted-foreground">{a.message}</p>
                        <button
                          onClick={() => {
                            setOpen(false);
                            navigate(`/support?ticket=${a.ticketId}`);
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:border-primary hover:text-primary"
                        >
                          Open ticket
                        </button>
                      </CollapsibleItem>
                    ))}
                  </div>
                </div>
              )}

              <DashakamQueueList />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
