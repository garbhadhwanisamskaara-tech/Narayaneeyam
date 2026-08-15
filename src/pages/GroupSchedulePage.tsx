import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Copy, Info, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupMembers, type Group } from "@/hooks/useGroups";
import { useDashakamSets, type DashakamSet } from "@/hooks/useDashakamSets";
import { useParayanamSchedule, type DistributionMode } from "@/hooks/useParayanamSchedule";
import {
  inviteParticipants,
  useSessionParticipants,
  type ParticipantStatus,
} from "@/hooks/useParayanamParticipants";
import ParticipantPicker from "@/components/ParticipantPicker";
import SEO from "@/components/SEO";

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
};
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export default function GroupSchedulePage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [searchParams] = useSearchParams();
  // A group can run several parayanams, so this page edits one specific
  // session when ?session=… is given, and otherwise adds a brand new one.
  const editingSessionId = searchParams.get("session");
  const { user } = useAuth();


  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [session, setSession] = useState<{
    id: string;
    parayanam_name: string | null;
    finalized_at: string | null;
    dashakam_set_id: string | null;
    dashakam_list: number[];
    start_date: string;
    end_date: string;
    challenge_type: string;
  } | null>(null);
  const [parayanamName, setParayanamName] = useState("");
  const [setId, setSetId] = useState<string>("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(99));
  const [mode, setMode] = useState<DistributionMode>("synchronized");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloWarning, setSoloWarning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const isFinalized = !!session?.finalized_at;

  const { sets, loading: loadingSets, forkSet } = useDashakamSets();
  const { members } = useGroupMembers(groupId, editingSessionId);
  const { rows, loading: loadingRows, updateRow, refresh } = useParayanamSchedule(editingSessionId);
  const { participants, statusFor, refresh: refreshParticipants } =
    useSessionParticipants(editingSessionId);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("groups")
        .select("id, group_name, owner_id, active_challenge_session_id, status, created_at")
        .eq("id", groupId)
        .maybeSingle();
      if (!cancelled) {
        setGroup((data ?? null) as Group | null);
        setLoadingGroup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    const sessionId = editingSessionId;
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("challenge_sessions")
        .select(
          "id, parayanam_name, finalized_at, dashakam_set_id, dashakam_list, start_date, end_date, challenge_type"
        )
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const s = data as typeof session extends infer T ? NonNullable<T> : never;
        setSession(s);
        if (s.parayanam_name) setParayanamName(s.parayanam_name);
        if (s.start_date) setStartDate(s.start_date);
        if (s.end_date) setEndDate(s.end_date);
        if (s.challenge_type === "group_relay") setMode("split");
        if (s.challenge_type === "group_standard") setMode("synchronized");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editingSessionId]);


  useEffect(() => {
    if (session?.dashakam_set_id && sets.some((s) => s.id === session.dashakam_set_id)) {
      setSetId(session.dashakam_set_id);
    } else if (!setId && sets.length) {
      setSetId(sets[0].id);
    }
  }, [sets, setId, session?.dashakam_set_id]);

  const selectedSet: DashakamSet | undefined = useMemo(
    () => sets.find((s) => s.id === setId),
    [sets, setId]
  );

  const isOwner = !!user && !!group && group.owner_id === user.id;
  const memberIds = members.map((m) => m.user_id);

  useEffect(() => {
    if (!user) return;
    setSelectedParticipants((prev) =>
      prev.length ? prev : memberIds.filter((id) => id !== user.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, user?.id]);
  const nameFor = (id: string | null) =>
    id ? members.find((m) => m.user_id === id)?.display_name ?? "Member" : "Everyone";

  const handleFork = async () => {
    if (!selectedSet) return;
    setBusy(true);
    setError(null);
    try {
      const copy = await forkSet(selectedSet);
      setSetId(copy.id);
      setNotice(`Created "${copy.set_name}" — you can edit this copy for your group.`);
    } catch (e: any) {
      setError(e?.message ?? "Could not customize this set.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!group || !selectedSet) return;
    if (endDate < startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }
    if (members.length <= 1 && !soloWarning) {
      setSoloWarning(true);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Editing one specific parayanam updates it in place; otherwise this
      // always adds a new parayanam alongside any the group already has.
      let sessionId = editingSessionId;

      const sessionPayload = {
        user_id: user!.id,
        group_id: group.id,
        parayanam_name: parayanamName.trim() || null,
        mode: "daily",
        challenge_type: mode === "synchronized" ? "group_standard" : "group_relay",
        start_date: startDate,
        end_date: endDate,
        technical_state: "ACTIVE",
        spiritual_state: "in_progress",
        dashakams_target: selectedSet.dashakam_list.length,
        dashakam_list: selectedSet.dashakam_list,
        dashakam_set_id: selectedSet.id,
      };

      if (sessionId) {
        const { error: upErr } = await (supabase as any)
          .from("challenge_sessions")
          .update(sessionPayload)
          .eq("id", sessionId);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { data, error: insErr } = await (supabase as any)
          .from("challenge_sessions")
          .insert(sessionPayload)
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        sessionId = data.id as string;
        // The group pointer is only a default for the group page, so set it
        // when nothing is pointed at yet and leave existing parayanams alone.
        if (!group.active_challenge_session_id) {
          const { error: gErr } = await (supabase as any)
            .from("groups")
            .update({ active_challenge_session_id: sessionId })
            .eq("id", group.id);
          if (gErr) throw new Error(gErr.message);
          setGroup({ ...group, active_challenge_session_id: sessionId });
        }
      }

      await inviteParticipants(sessionId!, selectedParticipants, includeSelf ? user!.id : null);
      await refresh();
      await refreshParticipants();
      setSoloWarning(false);
      setNotice(
        "Invites sent. The day-by-day schedule is prepared automatically when the parayanam begins."
      );

    } catch (e: any) {
      setError(e?.message ?? "Could not save the parayanam.");
    } finally {
      setBusy(false);
    }
  };

  if (loadingGroup) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!group || !isOwner) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <p className="font-sans text-sm text-muted-foreground">
          Only the group owner can plan the parayanam schedule.
        </p>
        <Link to="/groups" className="mt-4 inline-block font-sans text-sm text-primary">
          Back to groups
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <SEO
        path={`/groups/${groupId}/schedule`}
        title="Plan Group Parayanam — Sriman Narayaneeyam"
        description="Choose a dashakam set, timeline and distribution for your group parayanam."
      />
      <Link
        to={`/groups/${group.id}`}
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {group.group_name}
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
        {editingSessionId ? `Plan ${parayanamName.trim() || "the Parayanam"}` : "Add a Parayanam"}
      </h1>

      <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-peacock">
        {isFinalized ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Parayanam is live</p>
              <p className="mt-1 font-display text-lg font-semibold text-foreground">
                {session?.parayanam_name || "Parayanam"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Dashakam set</p>
                <p className="mt-1 font-sans text-sm text-foreground">
                  {session?.dashakam_set_id
                    ? sets.find((s) => s.id === session.dashakam_set_id)?.set_name ?? "Custom set"
                    : session?.dashakam_list?.length
                      ? `Custom selection (${session.dashakam_list.length} dashakams)`
                      : "—"}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Distribution</p>
                <p className="mt-1 font-sans text-sm text-foreground">
                  {mode === "synchronized" ? "Same Dashakam for everyone" : "Dashakams split among participants"}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Start date</p>
                <p className="mt-1 font-sans text-sm text-foreground">
                  {session?.start_date
                    ? new Date(`${session.start_date}T00:00:00Z`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">End date</p>
                <p className="mt-1 font-sans text-sm text-foreground">
                  {session?.end_date
                    ? new Date(`${session.end_date}T00:00:00Z`).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Confirmed participants</p>
              <ul className="mt-2 space-y-1">
                {participants.filter((p) => p.status === "confirmed").length === 0 ? (
                  <li className="font-sans text-sm text-muted-foreground">No confirmed participants yet.</li>
                ) : (
                  participants
                    .filter((p) => p.status === "confirmed")
                    .map((p) => (
                      <li key={p.user_id} className="font-sans text-sm text-foreground">
                        {members.find((m) => m.user_id === p.user_id)?.display_name ?? "Member"}
                      </li>
                    ))
                )}
              </ul>
            </div>

            {notice && <p className="font-sans text-sm text-primary">{notice}</p>}
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="parayanam-name" className="font-sans text-sm font-semibold text-foreground">
                Parayanam name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <input
                id="parayanam-name"
                type="text"
                maxLength={80}
                value={parayanamName}
                onChange={(e) => setParayanamName(e.target.value)}
                placeholder="Diwali 2026 Parayanam"
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="set" className="font-sans text-sm font-semibold text-foreground">
                Dashakam set
              </label>
              {loadingSets ? (
                <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />
              ) : (
                <select
                  id="set"
                  value={setId}
                  onChange={(e) => setSetId(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                >
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.set_name} ({s.dashakam_list.length} dashakams)
                      {s.is_official ? "" : " · yours"}
                    </option>
                  ))}
                </select>
              )}
              {selectedSet?.description && (
                <p className="mt-2 font-sans text-xs text-muted-foreground">{selectedSet.description}</p>
              )}
              {selectedSet?.is_official && (
                <button
                  onClick={handleFork}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:border-primary disabled:opacity-60"
                >
                  <Copy className="h-3.5 w-3.5" /> Customize for my group
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start" className="font-sans text-sm font-semibold text-foreground">
                  Start date
                </label>
                <input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="end" className="font-sans text-sm font-semibold text-foreground">
                  End date
                </label>
                <input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <TooltipProvider delayDuration={150}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-sans text-sm font-semibold text-foreground">Distribution</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Distribution modes"
                        className="text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px]">
                      <p className="font-sans text-xs text-popover-foreground">
                        Same Dashakam for everyone: all participants chant the same dashakam on the same day. Dashakams
                        split among participants: each dashakam is assigned to a different participant.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      ["synchronized", "Same Dashakam for everyone", ""],
                      ["split", "Dashakams split among participants", ""],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <button
                      key={value}
                      onClick={() => setMode(value)}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        mode === value ? "border-primary bg-secondary/40" : "border-border hover:border-primary"
                      }`}
                    >
                      <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
                      <span className="mt-1 block font-sans text-xs text-muted-foreground">{hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </TooltipProvider>

            <ParticipantPicker
              members={members}
              ownerId={group.owner_id}
              selected={selectedParticipants}
              onToggle={(id) =>
                setSelectedParticipants((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              includeSelf={includeSelf}
              onIncludeSelfChange={setIncludeSelf}
            />

            {participants.length > 0 && (
              <div>
                <p className="font-sans text-sm font-semibold text-foreground">Invite status</p>
                <ul className="mt-2 space-y-1">
                  {members.map((m) => {
                    const st = statusFor(m.user_id);
                    return (
                      <li key={m.user_id} className="flex items-center justify-between gap-3">
                        <span className="font-sans text-sm text-foreground">{m.display_name}</span>
                        <span className="rounded-full bg-secondary px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-secondary-foreground">
                          {st ? STATUS_LABEL[st] : "Not invited"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {soloWarning && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <p className="font-sans text-sm text-amber-900 dark:text-amber-100">
                  You're the only member in this group right now — this parayanam will run solo until others join. You can invite members from the group page.
                </p>
                <Link
                  to={`/groups/${group.id}#invite`}
                  className="mt-2 inline-block font-sans text-sm font-semibold text-primary hover:underline"
                >
                  Invite members →
                </Link>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={busy || !selectedSet}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {soloWarning ? "Continue anyway" : "Save & invite"}
            </button>

            {error && <p className="font-sans text-sm text-destructive">{error}</p>}
            {notice && <p className="font-sans text-sm text-primary">{notice}</p>}
          </>
        )}
      </section>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" /> Schedule
        </h2>
        {loadingRows ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <p className="mt-3 font-sans text-sm text-muted-foreground">
            The day-by-day schedule is prepared automatically on the start date, once invites are settled.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full font-sans text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Dashakam</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Assigned to</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2 font-semibold text-foreground">
                      {r.dashakam_no}
                      {r.is_manual_override && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                          edited
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        aria-label={`Date for dashakam ${r.dashakam_no}`}
                        value={r.scheduled_date}
                        onChange={(e) => void updateRow(r.id, { scheduled_date: e.target.value })}
                        className="rounded-lg border border-border bg-background px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-primary"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        aria-label={`Assignee for dashakam ${r.dashakam_no}`}
                        value={r.assigned_user_id ?? ""}
                        onChange={(e) =>
                          void updateRow(r.id, { assigned_user_id: e.target.value || null })
                        }
                        className="rounded-lg border border-border bg-background px-2 py-1 text-foreground outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Everyone</option>
                        {members.map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.display_name}
                          </option>
                        ))}
                      </select>
                      <span className="sr-only">{nameFor(r.assigned_user_id)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
