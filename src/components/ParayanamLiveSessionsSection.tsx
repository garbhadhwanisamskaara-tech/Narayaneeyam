import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type LiveSessionRow = {
  id: string;
  session_date: string;
  start_datetime: string;
  end_datetime: string;
};

/** "Sunday, 6 September 2026" — always Indian Standard Time, never the viewer's locale timezone. */
function fmtDateIST(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "8:00 PM" — always Indian Standard Time. */
function fmtTimeIST(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Read-only, informational list of every planned live session for a LIVE
 * parayanam. Meeting URLs are deliberately never selected or shown here —
 * joining stays with the existing Upcoming Live Session card. The owner gets
 * a "Manage Live Sessions" action that opens the existing management dialog.
 */
export default function ParayanamLiveSessionsSection({
  challengeSessionId,
  isOwner,
  onManage,
}: {
  challengeSessionId: string;
  isOwner: boolean;
  /** Opens the existing Manage Parayanam dialog (owner only). */
  onManage?: () => void;
}) {
  const [isLive, setIsLive] = useState(false);
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const { data: sessionData } = await (supabase as any)
        .from("challenge_sessions")
        .select("delivery_mode")
        .eq("id", challengeSessionId)
        .maybeSingle();

      if (cancelled) return;

      if (sessionData?.delivery_mode !== "LIVE") {
        setIsLive(false);
        setSessions([]);
        setLoading(false);
        return;
      }

      // Owner reads the owner view; members read the public view, which has no
      // meeting_url column at all. Either way, the URL is never fetched here.
      const { data: liveData } = await (supabase as any)
        .from(isOwner ? "live_sessions_owner" : "live_sessions_public")
        .select("id, session_date, start_datetime, end_datetime")
        .eq("challenge_session_id", challengeSessionId)
        .order("start_datetime", { ascending: true });

      if (cancelled) return;

      setIsLive(true);
      setSessions((liveData ?? []) as LiveSessionRow[]);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [challengeSessionId, isOwner]);

  if (loading || !isLive || sessions.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <span className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
          <Video className="h-4 w-4 text-primary" />
          Live Sessions ({sessions.length})
        </span>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4">
          <ul className="mt-3 max-h-[260px] space-y-3 overflow-y-auto pr-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <p className="font-sans text-sm font-semibold text-foreground">
                  {fmtDateIST(s.start_datetime)}
                </p>
                <p className="font-sans text-sm text-muted-foreground">
                  {fmtTimeIST(s.start_datetime)} – {fmtTimeIST(s.end_datetime)} IST
                </p>
              </li>
            ))}
          </ul>

          {isOwner && onManage && (
            <button
              type="button"
              onClick={onManage}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
            >
              Manage Live Sessions
            </button>
          )}
        </div>
      )}
    </div>
  );
}
