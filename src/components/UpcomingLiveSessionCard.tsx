import { useEffect, useState } from "react";
import { Calendar, ChevronDown, ChevronUp, Clock, Loader2, Lock, Users, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUpcomingLiveSessions, type UpcomingLiveSession } from "@/hooks/useUpcomingLiveSessions";

const REASON_MESSAGES: Record<string, string> = {
  ACCESS_LOCKED: "Your Guru has not approved your participation yet",
  NOT_CONFIRMED: "You are not confirmed for this Parayanam yet",
  BEFORE_ACTIVATION_WINDOW: "This opens closer to the session time",
  SESSION_ENDED: "This session has already ended",
  NO_MEETING_LINK: "Your Guru has not added the joining link yet",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmtShortDate(d: string | null) {
  if (!d) return null;

  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function SessionRow({ s, now }: { s: UpcomingLiveSession; now: number }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = new Date(s.startDatetime).getTime();
  const end = new Date(s.endDatetime).getTime();
  const opensAt = start - s.joinBeforeMins * 60_000;

  const canJoin = now >= opensAt && now < end;

  const duration =
    s.parayanamStartDate && s.parayanamEndDate
      ? `${fmtShortDate(s.parayanamStartDate)} – ${fmtShortDate(s.parayanamEndDate)}`
      : null;

  const handleJoin = async () => {
    setBusy(true);
    setMessage(null);

    try {
      const { data, error } = await (supabase as any).rpc("get_live_session_access", {
        p_session_id: s.liveSessionId,
      });

      if (error) throw error;

      const res = Array.isArray(data) ? data[0] : data;

      if (res?.can_join && res?.meeting_url) {
        window.open(res.meeting_url, "_blank", "noopener,noreferrer");
      } else {
        setMessage(REASON_MESSAGES[res?.reason as string] ?? "You cannot join this session right now");
      }
    } catch {
      toast({
        title: "Could not open the session",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }

    setBusy(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div>
        <p className="font-display text-lg font-semibold text-foreground">
          {s.parayanamName}
          {duration ? (
            <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">({duration})</span>
          ) : null}
        </p>

        <p className="mt-1 flex items-center gap-1.5 font-sans text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {s.groupName}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-sans text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          {fmtDate(s.sessionDate)}
        </span>

        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          {fmtTime(s.startDatetime)} – {fmtTime(s.endDatetime)}
        </span>
      </div>

      {!canJoin ? (
        <>
          <button
            type="button"
            disabled
            className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-muted px-5 py-3 font-sans text-sm font-semibold text-muted-foreground"
          >
            <Lock className="h-4 w-4" />
            Join opens at {fmtTime(new Date(opensAt).toISOString())}
          </button>

          <p className="mt-2 text-center font-sans text-xs text-muted-foreground">
            The live-session link becomes available {s.joinBeforeMins} minutes before the session.
          </p>
        </>
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={busy}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-peacock px-5 py-3 font-sans text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
          Join Live Session
        </button>
      )}

      {s.groupId && (
        <Link
          to={`/groups/${s.groupId}?session=${s.challengeSessionId}`}
          className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background px-5 py-3 font-sans text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          View Parayanam
        </Link>
      )}

      {message && <p className="mt-3 text-center font-sans text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}

export default function UpcomingLiveSessionCard() {
  const { sessions, loading } = useUpcomingLiveSessions();

  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);

    return () => window.clearInterval(id);
  }, []);

  if (loading || sessions.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="mb-3 flex w-full items-center justify-between rounded-xl px-1 py-2 text-left"
      >
        <h2 className="font-display text-lg font-semibold text-foreground">
          Upcoming Live Sessions ({sessions.length})
        </h2>

        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-4">
          {sessions.map((s) => (
            <SessionRow key={s.liveSessionId} s={s} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
