import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Loader2, Pencil, Video, Youtube } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  isValidYoutubeUrl,
  saveLiveSessionRecording,
  useLiveSessionRecordings,
} from "@/hooks/useLiveSessionRecordings";

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
 * One past session's row in the owner's recording manager: an inline
 * YouTube-link field that saves on submit. Kept local to the session it
 * edits so typing in one row never re-renders the whole list.
 */
function RecordingEditorRow({
  session,
  existingUrl,
  onSaved,
}: {
  session: LiveSessionRow;
  existingUrl: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(existingUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUrl(existingUrl ?? "");
  }, [existingUrl]);

  const handleSave = async () => {
    const trimmed = url.trim();
    if (!isValidYoutubeUrl(trimmed)) {
      toast({
        title: "That doesn't look like a YouTube link",
        description: "Paste a link starting with https://youtube.com/... or https://youtu.be/...",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      await saveLiveSessionRecording(session.id, trimmed);
      toast({ title: existingUrl ? "Recording link updated" : "Recording link added" });
      setEditing(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Could not save the link", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-sm font-semibold text-foreground">
            {fmtDateIST(session.start_datetime)}
          </p>
          <p className="font-sans text-sm text-muted-foreground">
            {fmtTimeIST(session.start_datetime)} – {fmtTimeIST(session.end_datetime)} IST ·{" "}
            {existingUrl ? "Recording added" : "No recording yet"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {existingUrl && !editing && (
            <a
              href={existingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <Youtube className="h-3.5 w-3.5" /> Watch
            </a>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:border-primary"
          >
            <Pencil className="h-3.5 w-3.5" /> {existingUrl ? "Change" : "Add link"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Read-only, informational list of every planned live session for a LIVE
 * parayanam. Meeting URLs are deliberately never selected or shown here —
 * joining stays with the existing Upcoming Live Session card. The owner gets
 * a "Manage Live Sessions" action that opens the existing management dialog.
 *
 * Below that, past sessions get their own area: confirmed members see a
 * "Click here to view past sessions" link that reveals whichever sessions
 * have a YouTube link (the get_live_session_recordings RPC is what actually
 * restricts this to confirmed, eligible participants — an unconfirmed
 * member's call simply comes back empty); the owner instead sees an inline
 * editor to paste each session's recording link.
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
  const [pastExpanded, setPastExpanded] = useState(false);

  const { urlsBySessionId, loading: loadingRecordings, refresh: refreshRecordings } =
    useLiveSessionRecordings(challengeSessionId);

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

  const pastSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => new Date(s.end_datetime).getTime() < now);
  }, [sessions]);

  // Past sessions a non-owner may actually watch — the RPC already filtered
  // this to confirmed/eligible participants, so any id present here is safe
  // to show.
  const viewablePastSessions = useMemo(
    () => pastSessions.filter((s) => urlsBySessionId.has(s.id)),
    [pastSessions, urlsBySessionId],
  );

  if (loading || !isLive || sessions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border">
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

      {isOwner ? (
        pastSessions.length > 0 && (
          <div className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setPastExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={pastExpanded}
            >
              <span className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                <Youtube className="h-4 w-4 text-primary" />
                Past Sessions — add recording links
              </span>
              {pastExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {pastExpanded && (
              <div className="border-t border-border px-4 pb-4">
                {loadingRecordings ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading recordings…
                  </div>
                ) : (
                  <ul className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                    {pastSessions.map((s) => (
                      <RecordingEditorRow
                        key={s.id}
                        session={s}
                        existingUrl={urlsBySessionId.get(s.id) ?? null}
                        onSaved={refreshRecordings}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        !loadingRecordings &&
        viewablePastSessions.length > 0 && (
          <div className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setPastExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={pastExpanded}
            >
              <span className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                <Youtube className="h-4 w-4 text-primary" />
                Click here to view past sessions
              </span>
              {pastExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {pastExpanded && (
              <div className="border-t border-border px-4 pb-4">
                <ul className="mt-3 max-h-[360px] space-y-3 overflow-y-auto pr-2">
                  {viewablePastSessions.map((s) => (
                    <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                      <p className="font-sans text-sm font-semibold text-foreground">
                        {fmtDateIST(s.start_datetime)}
                      </p>
                      <a
                        href={urlsBySessionId.get(s.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <Youtube className="h-3.5 w-3.5" /> Watch
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
