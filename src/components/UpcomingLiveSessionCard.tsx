import { useEffect, useState } from "react";
import { Calendar, Clock, Flower2, Loader2, Users, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  useUpcomingLiveSessions,
  type UpcomingLiveSession,
} from "@/hooks/useUpcomingLiveSessions";

const REASON_MESSAGES: Record<string, string> = {
  ACCESS_LOCKED: "Your Guru hasn't confirmed your contribution yet",
  NOT_CONFIRMED: "You are not confirmed for this parayanam yet",
  BEFORE_ACTIVATION_WINDOW: "This opens closer to the session time",
  SESSION_ENDED: "This session has already ended",
  NO_MEETING_LINK: "Your Guru hasn't added the joining link yet",
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

function SessionRow({ s, now }: { s: UpcomingLiveSession; now: number }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const start = new Date(s.startDatetime).getTime();
  const end = new Date(s.endDatetime).getTime();
  const opensAt = start - s.joinBeforeMins * 60_000;
  const canJoin = now >= opensAt && now < end;

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
        setMessage(
          REASON_MESSAGES[res?.reason as string] ?? "You can't join this session right now",
        );
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
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-display text-base font-semibold text-foreground">{s.parayanamName}</p>
      <p className="flex items-center gap-1.5 font-sans text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {s.groupName}
      </p>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-sans text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" /> {fmtDate(s.sessionDate)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {fmtTime(s.startDatetime)} – {fmtTime(s.endDatetime)}
        </span>
      </div>

      <p className="mt-2 font-sans text-sm text-foreground">
        {s.dashakams.length
          ? `Today's Dashakam${s.dashakams.length > 1 ? "s" : ""}: ${s.dashakams.join(", ")}`
          : "No Dashakam allocated for this day yet."}
      </p>

      <button
        type="button"
        onClick={handleJoin}
        disabled={!canJoin || busy}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-sans text-sm font-semibold transition-transform ${
          canJoin
            ? "bg-gradient-peacock text-primary-foreground hover:scale-[1.02]"
            : "cursor-not-allowed border border-border bg-muted text-muted-foreground"
        }`}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
        {canJoin ? "Join Parayanam" : `Opens at ${fmtTime(new Date(opensAt).toISOString())}`}
      </button>

      {s.groupId && (
        <Link
          to={`/groups/${s.groupId}?session=${s.challengeSessionId}`}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-3 font-sans text-sm font-semibold text-foreground transition-colors hover:bg-muted"
        >
          <Flower2 className="h-4 w-4" /> View today's Dashakam
        </Link>
      )}

      {message && <p className="mt-2 font-sans text-xs text-muted-foreground">{message}</p>}

      <p className="mt-2 font-sans text-xs text-muted-foreground">
        Can't join live? You can still complete your Dashakam at your own time.
      </p>
    </div>
  );
}

export default function UpcomingLiveSessionCard() {
  const { sessions, loading } = useUpcomingLiveSessions();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  if (loading || sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">Upcoming live sessions</h2>
      {sessions.map((s) => (
        <SessionRow key={s.liveSessionId} s={s} now={now} />
      ))}
    </div>
  );
}
