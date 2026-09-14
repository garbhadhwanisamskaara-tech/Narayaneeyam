import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Youtube } from "lucide-react";
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

/**
 * Home-page card: past live sessions that already have a recording, across
 * all of the member's parayanams, collapsed behind "Click here to view past
 * sessions". Sessions without a recording yet are left out entirely — this
 * card only ever lists something the viewer can actually watch. Recording
 * links are still added by the owner from Manage Parayanam; this card is
 * read-only.
 */
export default function PastLiveSessionsCard() {
  const { sessions, loading } = useMyPastLiveSessions();
  const [expanded, setExpanded] = useState(false);

  const withRecording = useMemo(
    () => sessions.filter((s) => s.youtubeUrl),
    [sessions],
  );

  if (loading || withRecording.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
        aria-expanded={expanded}
      >
        <h2 className="font-display text-lg font-semibold text-foreground">
          Click here to view past sessions ({withRecording.length})
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
              {withRecording.map((s) => (
                <li
                  key={s.id}
                  className="grid grid-cols-2 items-center gap-2 px-4 py-3"
                >
                  <span className="font-sans text-sm text-foreground">
                    {s.parayanamName}
                  </span>

                  <a
                    href={s.youtubeUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    <Youtube className="h-3.5 w-3.5" />
                    {fmtDateIST(s.startDatetime)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
