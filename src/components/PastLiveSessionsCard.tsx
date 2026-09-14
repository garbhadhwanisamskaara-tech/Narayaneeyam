import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X, Youtube } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPastLiveSessions } from "@/hooks/useMyPastLiveSessions";

/** "14 Sep 2026" — always Indian Standard Time. */
function fmtDateIST(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dismissedKey(userId: string) {
  return `narayaneeyam:dismissedPastSessions:${userId}`;
}

/**
 * "Don't show this again" for sessions with no recording yet. Deliberately
 * local-only (per browser, not per account) — this is a personal declutter
 * preference, not data anyone else needs to see, so it doesn't need a
 * database round trip or a new column/grant to get right.
 */
function loadDismissed(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedKey(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(dismissedKey(userId), JSON.stringify(Array.from(ids)));
  } catch {
    /* best-effort only */
  }
}

/**
 * Home-page card: every past live session across all of the member's
 * parayanams, collapsed behind "Click here to view past sessions". A
 * session with a recording shows its date as a link straight to YouTube; one
 * without yet shows "Recording not available yet" with a dismiss (×) that
 * hides just that row for this browser going forward. Recording links are
 * still added by the owner from Manage Parayanam — this card is read-only.
 */
export default function PastLiveSessionsCard() {
  const { user } = useAuth();
  const { sessions, loading } = useMyPastLiveSessions();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) setDismissed(loadDismissed(user.id));
  }, [user]);

  const visible = useMemo(
    () => sessions.filter((s) => s.youtubeUrl || !dismissed.has(s.id)),
    [sessions, dismissed],
  );

  const dismiss = (id: string) => {
    if (!user) return;
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    saveDismissed(user.id, next);
  };

  if (loading || visible.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
        aria-expanded={expanded}
      >
        <h2 className="font-display text-lg font-semibold text-foreground">
          Click here to view past sessions ({visible.length})
        </h2>

        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-background/50 p-3 pr-2 scrollbar-thin">
          <div className="rounded-xl border border-border bg-card">
            <div className="grid grid-cols-2 gap-2 border-b border-border px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Parayanam</span>
              <span>Date</span>
            </div>

            <ul className="divide-y divide-border">
              {visible.map((s) => (
                <li key={s.id} className="grid grid-cols-2 gap-2 px-4 py-3 items-center">
                  <span className="font-sans text-sm text-foreground">{s.parayanamName}</span>

                  <div className="flex items-center gap-2">
                    {s.youtubeUrl ? (
                      <a
                        href={s.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        {fmtDateIST(s.startDatetime)}
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-2 font-sans text-sm text-muted-foreground">
                        <span>{fmtDateIST(s.startDatetime)} · Recording not available yet</span>
                        <button
                          type="button"
                          onClick={() => dismiss(s.id)}
                          aria-label="Dismiss — recording not available yet"
                          className="rounded p-0.5 hover:bg-muted"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
