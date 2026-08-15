import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Share2,
  Ban,
  CalendarDays,
  UserMinus,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  PlayCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupInvite, useGroupMembers, inviteLink, type Group } from "@/hooks/useGroups";
import SEO from "@/components/SEO";
import DashakamGarden from "@/components/DashakamGarden";
import { useSessionGarden } from "@/hooks/useSessionGarden";
import PendingInvitesSection from "@/components/PendingInvitesSection";
import PushRemindersPrompt from "@/components/PushRemindersPrompt";
import ParayanamScheduleViews from "@/components/ParayanamScheduleViews";
import { toast } from "@/hooks/use-toast";
import { useSessionParticipants, type ParticipantStatus } from "@/hooks/useParayanamParticipants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


// Copy for the "How group parayanam works" help panel. Kept in one place so it is easy to tweak after review.
const STATUS_LABEL: Record<ParticipantStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
};

type HelpRow = { icon: string; title: string; subtitle: string };
type HelpColumn = { title: string; rows: HelpRow[] };

const HELP_COPY: { owner: HelpColumn; member: HelpColumn; closing: string } = {
  owner: {
    title: "If you're the owner",
    rows: [
      { icon: "📋", title: "Plan", subtitle: "Dashakams, dates, sharing mode" },
      { icon: "📩", title: "Invite", subtitle: "Pick who's invited" },
      { icon: "📈", title: "Track", subtitle: "Member list & garden" },
    ],
  },
  member: {
    title: "If you're a member",
    rows: [
      { icon: "📅", title: "See your dashakam", subtitle: "Appears as a tile" },
      { icon: "🙏", title: "Chant or read", subtitle: "At your own pace" },
      { icon: "✅", title: "Tap when done", subtitle: "Marks it complete" },
    ],
  },
  closing: "The garden reflects everyone's progress together, not just yours.",
};

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [target, setTarget] = useState<number | null>(null);
  const [dashakamNumbers, setDashakamNumbers] = useState<number[] | undefined>(undefined);
  const [sessionStartDate, setSessionStartDate] = useState<string | null>(null);
  const [sessionFinalizedAt, setSessionFinalizedAt] = useState<string | null>(null);
  const [parayanamName, setParayanamName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [membersOpen, setMembersOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);

  const { invite, loading, generateInvite, revokeInvite, regenerateInvite } = useGroupInvite(groupId);
  const {
    members,
    loading: loadingMembers,
    removeMember,
    refresh: refreshMembers,
  } = useGroupMembers(groupId, group?.active_challenge_session_id);
  const {
    blooms: gardenBlooms,
    tiles: gardenTiles,
    dashakamNumbers: gardenDashakams,
    loading: gardenLoading,
    pending: gardenPending,
    refresh: refreshGarden,
    toggleDashakam,
  } = useSessionGarden(group?.active_challenge_session_id);
  const {
    participants,
    loading: loadingParticipants,
    statusFor,
  } = useSessionParticipants(group?.active_challenge_session_id);



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
    const sessionId = group?.active_challenge_session_id;
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("challenge_sessions")
        .select("dashakams_target, dashakam_list, start_date, finalized_at, parayanam_name")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      setTarget(data?.dashakams_target ?? null);
      setSessionStartDate(data?.start_date ?? null);
      setSessionFinalizedAt(data?.finalized_at ?? null);
      setParayanamName(data?.parayanam_name ?? null);

      let list = Array.isArray(data?.dashakam_list)
        ? (data.dashakam_list as any[]).map(Number).filter((n) => Number.isFinite(n))
        : [];

      // A finalized parayanam may store its dashakams only in the generated
      // schedule (dashakam_list can be null when a saved set was used).
      if (!list.length) {
        const { data: rows } = await (supabase as any)
          .from("parayanam_schedule")
          .select("dashakam_no")
          .eq("challenge_session_id", sessionId);
        if (cancelled) return;
        list = Array.from(
          new Set(((rows ?? []) as any[]).map((r) => Number(r.dashakam_no)).filter((n) => Number.isFinite(n)))
        ).sort((a, b) => a - b);
      }

      setDashakamNumbers(list.length ? list : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.active_challenge_session_id, refreshKey]);

  const isOwner = !!user && !!group && group.owner_id === user.id;
  const ownerMember = members.find((m) => m.user_id === group?.owner_id);
  const ownerName = ownerMember?.display_name ?? null;

  // Only people with a relationship to the active parayanam (invited, confirmed
  // or declined) — plus the owner, who runs it — may see its progress.
  const hasSession = !!group?.active_challenge_session_id;
  const isParayanamParticipant =
    isOwner || (!!user && participants.some((p) => p.user_id === user.id));
  const canSeeParayanamData = !hasSession || isParayanamParticipant;

  // Prefer the live schedule the garden loaded; fall back to the session's list.
  const gardenNumbers = gardenDashakams.length ? gardenDashakams : (dashakamNumbers ?? []);

  /** A completion write must refresh the garden, its header count, the schedule views and the member counts together. */
  const handleTapDashakam = async (dashakamNo: number) => {
    await toggleDashakam(dashakamNo);
    setRefreshKey((k) => k + 1);
    await refreshMembers();
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e: any) {
      setActionError(e?.message ?? "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const todayISO = new Date().toISOString().slice(0, 10);
  const canStartNow =
    isOwner && !!group?.active_challenge_session_id && !!sessionStartDate && sessionStartDate <= todayISO && !sessionFinalizedAt;

  const handleStartNow = async () => {
    if (!group?.active_challenge_session_id) return;
    setStarting(true);
    const { error } = await (supabase as any).rpc("finalize_parayanam", {
      p_session_id: group.active_challenge_session_id,
    });
    setStarting(false);
    if (error) {
      toast({ title: "Could not start the parayanam", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Parayanam started", description: "The day-by-day schedule is ready." });
    setRefreshKey((k) => k + 1);
    await refreshGarden();
  };

  const handleCopy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(inviteLink(invite.token));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Could not copy — please copy the link manually.");
    }
  };

  const initials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "D";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <SEO
        path={`/groups/${groupId}`}
        title="Group Parayanam — Sriman Narayaneeyam"
        description="Chant Narayaneeyam together with your group."
      />
      <Link
        to="/groups"
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      {loadingGroup ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      ) : !group ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">This group could not be found.</p>
      ) : group.status === "dissolved" ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-peacock">
          <h1 className="font-display text-xl font-bold text-foreground">{group.group_name}</h1>
          <p className="mt-2 font-sans text-sm text-muted-foreground">
            This group has been dissolved. Everyone keeps their own chanting history and feathers.
          </p>
          <Link
            to="/groups"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Back to your groups
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">{group.group_name}</h1>
              {group.active_challenge_session_id && (
                <p className="font-sans text-sm text-muted-foreground">{parayanamName || "Parayanam"}</p>
              )}
            </div>
            <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 font-sans text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-4 w-4" /> How group parayanam works
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg font-semibold">How group parayanam works</DialogTitle>
                  <DialogDescription className="font-sans text-sm">
                    A quick guide to chanting together.
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-2 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {[HELP_COPY.owner, HELP_COPY.member].map((column) => (
                    <div key={column.title}>
                      <h3 className="font-display text-sm font-semibold text-foreground">{column.title}</h3>
                      <div className="mt-3 space-y-3">
                        {column.rows.map((row, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none" aria-hidden="true">
                              {row.icon}
                            </span>
                            <div className="flex min-w-0 flex-col">
                              <span className="font-sans text-sm font-semibold text-foreground">{row.title}</span>
                              <span className="font-sans text-xs text-muted-foreground">{row.subtitle}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-5 text-center font-sans text-xs text-muted-foreground">
                  {HELP_COPY.closing}
                </p>
              </DialogContent>
            </Dialog>
          </div>

          <PendingInvitesSection groupId={groupId} />

          <PushRemindersPrompt />

          {isOwner && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <h2 className="font-display text-lg font-semibold text-foreground">
                {group.active_challenge_session_id ? parayanamName || "Parayanam" : "Parayanam"} Schedule
              </h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {group.active_challenge_session_id
                  ? "Review or reassign the dashakams for your group."
                  : "Choose a dashakam set, a timeline and how the dashakams are shared."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to={`/groups/${group.id}/schedule`}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <CalendarDays className="h-4 w-4" />
                  {group.active_challenge_session_id ? "Manage schedule" : "Plan parayanam"}
                </Link>
                <Link
                  to={`/parayanam/new?group=${group.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
                >
                  Create a Parayanam
                </Link>
                {canStartNow && (
                  <button
                    onClick={handleStartNow}
                    disabled={starting}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-sans text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                  >
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                    Start parayanam now
                  </button>
                )}
              </div>
            </section>
          )}

          <div className="mt-6">
            {hasSession && loadingParticipants ? (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : !canSeeParayanamData ? (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                <h2 className="font-display text-xl font-bold text-foreground">Group Dashakam Garden</h2>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  You're not part of this group's current parayanam. The garden will bloom for you once
                  you're invited to join one.
                </p>
              </div>
            ) : !!group.active_challenge_session_id && gardenNumbers.length > 0 ? (
              <DashakamGarden
                blooms={gardenBlooms}
                dashakamNumbers={gardenNumbers}
                tiles={gardenTiles}
                onTapDashakam={handleTapDashakam}
                pendingDashakam={gardenPending}
                title={`${parayanamName || "Parayanam"} — Dashakam Garden`}
                loading={gardenLoading}
              />
            ) : (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                <h2 className="font-display text-xl font-bold text-foreground">Group Dashakam Garden</h2>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  {group.active_challenge_session_id
                    ? "The day-by-day schedule is prepared automatically when this parayanam begins."
                    : "No parayanam running yet — the garden will appear once one starts."}
                </p>
              </div>
            )}
          </div>

          <ParayanamScheduleViews
            challengeSessionId={group.active_challenge_session_id}
            refreshKey={refreshKey}
          />




          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
            <button
              type="button"
              onClick={() => setMembersOpen((v) => !v)}
              aria-expanded={membersOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h2 className="font-display text-lg font-semibold text-foreground">
                Members{members.length ? ` (${members.length})` : ""}
              </h2>
              {membersOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
            {!membersOpen ? null : loadingMembers ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
            ) : members.length === 0 ? (
              <p className="mt-3 font-sans text-sm text-muted-foreground">
                No members yet — share the invite link below.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-peacock font-sans text-xs font-bold text-primary-foreground">
                      {initials(m.display_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-sm font-semibold text-foreground">
                        {m.display_name}
                        {m.user_id === group.owner_id && (
                          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-secondary-foreground">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
                        <span>
                          {group.active_challenge_session_id
                            ? `${m.completed}${target ? ` / ${target}` : ""} dashakams completed`
                            : "No active parayanam yet"}
                        </span>
                        {isOwner && group.active_challenge_session_id && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                            {statusFor(m.user_id) ? STATUS_LABEL[statusFor(m.user_id)!] : "Not invited"}
                          </span>
                        )}
                      </p>
                    </div>
                    {isOwner && m.user_id !== group.owner_id && (
                      <button
                        onClick={() => run(() => removeMember(m.id))}
                        disabled={busy}
                        aria-label={`Remove ${m.display_name}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-destructive hover:border-destructive disabled:opacity-60"
                      >
                        <UserMinus className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {membersOpen && members.length === 1 && (
              <p className="mt-3 font-sans text-xs text-muted-foreground">
                Invite others to join this group's parayanam.
              </p>
            )}
          </section>

          {isOwner && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <h2 className="font-display text-lg font-semibold text-foreground">Share Invite</h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Anyone with this link can join your group.
              </p>

              {loading ? (
                <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
              ) : invite ? (
                <>
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <code className="flex-1 truncate font-sans text-sm text-foreground">
                      {inviteLink(invite.token)}
                    </code>
                    <button onClick={handleCopy} aria-label="Copy invite link" className="text-primary hover:opacity-80">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => run(regenerateInvite)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" /> Regenerate link
                    </button>
                    <button
                      onClick={() => run(revokeInvite)}
                      disabled={busy}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-destructive hover:border-destructive disabled:opacity-60"
                    >
                      <Ban className="h-4 w-4" /> Revoke link
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => run(generateInvite)}
                  disabled={busy}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Share Invite
                </button>
              )}

              {actionError && <p className="mt-3 font-sans text-sm text-destructive">{actionError}</p>}
            </section>
          )}

          <div className="mt-6">
            <Link
              to={`/groups/${group.id}/settings`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Settings className="h-4 w-4" /> Manage group
            </Link>
          </div>

        </>
      )}
    </div>
  );
}
