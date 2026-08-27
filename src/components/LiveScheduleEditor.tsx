import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

export type LiveSession = {
  key: string;
  session_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  meeting_url: string;
  join_before_mins: number;
};

/** Sessions follow the parayanam days ("scheduled"), or are added by hand. */
export type ScheduleOption = "scheduled" | "individually";

export type LiveScheduleValue = {
  option: ScheduleOption;
  startTime: string;
  endTime: string;
  meetingUrl: string;
  joinBeforeMins: number;
  sessions: LiveSession[];
};

export const JOIN_WINDOWS = [5, 10, 15, 30];

export const emptyLiveSchedule = (): LiveScheduleValue => ({
  option: "scheduled",
  startTime: "06:00",
  endTime: "07:00",
  meetingUrl: "",
  joinBeforeMins: 10,
  sessions: [],
});

export const isValidMeetingUrl = (url: string) => {
  try {
    const u = new URL(url.trim());
    return u.protocol === "https:" && u.hostname.includes(".");
  } catch {
    return false;
  }
};
export const isLiveScheduleValid = (v: LiveScheduleValue) =>
  v.sessions.length > 0 &&
  v.sessions.every(
    (s) =>
      s.session_date &&
      s.start_time &&
      s.end_time &&
      s.end_time > s.start_time &&
      isValidMeetingUrl(s.meeting_url || v.meetingUrl),
  );

/**
 * One session per ACTUAL parayanam day — never for the dates in between.
 * Per-session edits already made are kept, matched on the date.
 */
export const generateSessions = (v: LiveScheduleValue, dates: string[]): LiveSession[] => {
  if (v.option === "individually") return v.sessions;
  const existing = new Map(v.sessions.map((s) => [s.session_date, s]));
  return dates.map((d) => {
    const prev = existing.get(d);
    return {
      key: d,
      session_date: d,
      start_time: prev?.start_time ?? v.startTime,
      end_time: prev?.end_time ?? v.endTime,
      meeting_url: (prev?.meeting_url ?? v.meetingUrl).trim(),
      join_before_mins: prev?.join_before_mins ?? v.joinBeforeMins,
    };
  });
};

const prettyDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const inputClass =
  "mt-2 w-full rounded-xl border-2 border-border bg-background px-4 py-3 font-sans text-base text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary";

const cardClass = (active: boolean) =>
  `flex min-h-[88px] w-full flex-col justify-center rounded-2xl border-2 p-4 text-left transition-colors ${
    active ? "border-primary bg-secondary/40" : "border-border hover:border-primary"
  }`;

export default function LiveScheduleEditor({
  value,
  onChange,
  dates,
}: {
  value: LiveScheduleValue;
  onChange: (v: LiveScheduleValue) => void;
  /** The actual parayanam days, decided on the first screen. */
  dates: string[];
}) {
  const [showAll, setShowAll] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  /** Any change to the plan or the shared defaults rebuilds every session. */
  const apply = (patch: Partial<LiveScheduleValue>) => {
    const next = { ...value, ...patch };
    next.sessions = generateSessions(next, dates);
    onChange(next);
    setEditingKey(null);
  };

  const setSessions = (sessions: LiveSession[]) => onChange({ ...value, sessions });

  const addSession = () =>
    setSessions([
      ...value.sessions,
      {
        key: `manual-${Date.now()}`,
        session_date: value.sessions.at(-1)?.session_date ?? dates[0] ?? "",
        start_time: value.startTime,
        end_time: value.endTime,
        meeting_url: value.meetingUrl.trim(),
        join_before_mins: value.joinBeforeMins,
      },
    ]);

  /** Scoped edit: this session, this and future ones, or all of them. */
  const applyScoped = (index: number, patch: Partial<LiveSession>, scope: "one" | "future" | "all") => {
    setSessions(
      value.sessions.map((s, i) => {
        const inScope = scope === "all" || (scope === "future" ? i >= index : i === index);
        if (!inScope) return s;
        // Date only ever changes for the session being edited.
        const { session_date, ...shared } = patch;
        return { ...s, ...(i === index ? patch : shared) };
      }),
    );
    setEditingKey(null);
  };

  const sessions = value.sessions;
  const compact = !showAll && sessions.length > 8;
  const visible = compact ? [...sessions.slice(0, 3), ...sessions.slice(-3)] : sessions;

  return (
    <div className="space-y-7">
      <div>
        <p className="font-sans text-base font-semibold text-foreground">When will you meet?</p>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Your parayanam days were chosen on the first screen — {dates.length} {dates.length === 1 ? "day" : "days"} in
          all.
        </p>
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          <span className="text-destructive" aria-hidden="true">*</span> Required fields
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["scheduled", "On every parayanam day", "One session on each of your parayanam days."],
              ["individually", "Add sessions individually", "Add each session yourself."],
            ] as const
          ).map(([opt, label, hint]) => (
            <button
              key={opt}
              type="button"
              aria-pressed={value.option === opt}
              onClick={() => apply({ option: opt, sessions: opt === "individually" ? [] : value.sessions })}
              className={cardClass(value.option === opt)}
            >
              <span className="font-sans text-base font-bold text-foreground">{label}</span>
              <span className="mt-1 font-sans text-sm text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <p className="font-sans text-base font-semibold text-foreground">Timings for every session</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="live-start" className="font-sans text-base font-semibold text-foreground">
              Start time <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="live-start"
              type="time"
              value={value.startTime}
              onChange={(e) => apply({ startTime: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="live-end" className="font-sans text-base font-semibold text-foreground">
              End time <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id="live-end"
              type="time"
              value={value.endTime}
              onChange={(e) => apply({ endTime: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="live-url" className="font-sans text-base font-semibold text-foreground">
            Joining link <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input
            id="live-url"
            type="url"
            inputMode="url"
            value={value.meetingUrl}
            onChange={(e) => apply({ meetingUrl: e.target.value })}
            placeholder="https://meet.google.com/..."
            className={inputClass}
          />
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            Used for every session. You can give a single session a different link below.
          </p>
          {value.meetingUrl.trim() && !isValidMeetingUrl(value.meetingUrl) && (
            <p className="mt-1 font-sans text-sm text-destructive">
              Please enter a complete link starting with https://
            </p>
          )}
        </div>

        <div>
          <p className="font-sans text-base font-semibold text-foreground">When should the join button appear?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {JOIN_WINDOWS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={value.joinBeforeMins === m}
                onClick={() => apply({ joinBeforeMins: m })}
                className={`min-w-[120px] rounded-xl border-2 px-4 py-3 font-sans text-base font-semibold transition-colors ${
                  value.joinBeforeMins === m
                    ? "border-primary bg-secondary/40 text-foreground"
                    : "border-border text-muted-foreground hover:border-primary"
                }`}
              >
                {m} minutes before
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-base font-semibold text-foreground">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} planned
          </p>
          {sessions.length > 8 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="rounded-lg border-2 border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
            >
              {showAll ? "Show fewer" : "View all sessions"}
            </button>
          )}
        </div>

        {sessions.length === 0 && <p className="mt-2 font-sans text-sm text-muted-foreground">No sessions yet.</p>}

        <ul className="mt-3 space-y-2">
          {visible.map((s) => {
            const index = sessions.findIndex((x) => x.key === s.key);
            const editing = editingKey === s.key;
            return (
              <li key={s.key} className="rounded-xl border-2 border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-sans text-base font-semibold text-foreground">
                      {s.session_date ? prettyDate(s.session_date) : "Pick a date"}
                    </p>
                    <p className="font-sans text-sm text-muted-foreground">
                      {s.start_time} – {s.end_time} ·{" "}
                      {isValidMeetingUrl(s.meeting_url || value.meetingUrl)
                        ? "Meeting link added"
                        : "Meeting link missing"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingKey(editing ? null : s.key)}
                      className="inline-flex items-center gap-2 rounded-lg border-2 border-border px-3 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
                    >
                      <Pencil className="h-4 w-4" /> {editing ? "Close" : "Change"}
                    </button>
                    {value.option === "individually" && (
                      <button
                        type="button"
                        aria-label="Remove session"
                        onClick={() => setSessions(sessions.filter((x) => x.key !== s.key))}
                        className="rounded-lg border-2 border-border p-2 text-muted-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {editing && (
                  <SessionEditor
                    session={s}
                    allowDate={value.option === "individually"}
                    onApply={(patch, scope) => applyScoped(index, patch, scope)}
                  />
                )}
              </li>
            );
          })}
        </ul>

        {compact && (
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            Showing the first and last few of {sessions.length} sessions.
          </p>
        )}

        {value.option === "individually" && (
          <button
            type="button"
            onClick={addSession}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border-2 border-border px-4 py-3 font-sans text-base font-semibold text-foreground hover:border-primary"
          >
            <Plus className="h-5 w-5" /> Add a session
          </button>
        )}
      </div>
    </div>
  );
}

function SessionEditor({
  session,
  allowDate,
  onApply,
}: {
  session: LiveSession;
  allowDate: boolean;
  onApply: (patch: Partial<LiveSession>, scope: "one" | "future" | "all") => void;
}) {
  const [date, setDate] = useState(session.session_date);
  const [start, setStart] = useState(session.start_time);
  const [end, setEnd] = useState(session.end_time);
  const [url, setUrl] = useState(session.meeting_url);

  const patch = (): Partial<LiveSession> => ({
    ...(allowDate ? { session_date: date } : {}),
    start_time: start,
    end_time: end,
    meeting_url: url.trim(),
  });

  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {allowDate && (
          <div>
            <label className="font-sans text-sm font-semibold text-foreground">
              Date <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
        )}
        <div>
          <label className="font-sans text-sm font-semibold text-foreground">
            Start time <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="font-sans text-sm font-semibold text-foreground">
            End time <span className="text-destructive" aria-hidden="true">*</span>
          </label>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="font-sans text-sm font-semibold text-foreground">
          Joining link <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className={inputClass}
        />
      </div>
      <p className="font-sans text-sm font-semibold text-foreground">Apply this change to</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {(
          [
            ["one", "This session only"],
            ["future", "This and future sessions"],
            ["all", "All sessions"],
          ] as const
        ).map(([scope, label]) => (
          <button
            key={scope}
            type="button"
            onClick={() => onApply(patch(), scope)}
            className="rounded-xl border-2 border-border px-4 py-3 font-sans text-sm font-semibold text-foreground hover:border-primary"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
