import { useEffect, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  CalendarDays,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Settings,
  PlayCircle,
  Plus,
  BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deriveDistributionMode } from "@/hooks/useParayanamSchedule";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupMembers, useGroups, type Group } from "@/hooks/useGroups";

import { useGroupParayanams, parayanamLabel } from "@/hooks/useGroupParayanams";
import SEO from "@/components/SEO";
import DashakamGarden from "@/components/DashakamGarden";
import FeatherCollection from "@/components/FeatherCollection";
import { useSessionGarden } from "@/hooks/useSessionGarden";
import { useMyDashakamGarden } from "@/hooks/useMyDashakamGarden";
import { isParticipantEligible } from "@/lib/parayanamEligibility";
import PendingInvitesSection from "@/components/PendingInvitesSection";
import ManageParayanamDialog from "@/components/ManageParayanamDialog";
import ParayanamLiveSessionsSection from "@/components/ParayanamLiveSessionsSection";
import ParayanamParticipantManager from "@/components/ParayanamParticipantManager";
import ParayanamDraftsList from "@/components/ParayanamDraftsList";
import ParayanamScheduleViews from "@/components/ParayanamScheduleViews";
import { toast } from "@/hooks/use-toast";
import { useSessionParticipants, type ParticipantStatus } from "@/hooks/useParayanamParticipants";
import { useCapabilities } from "@/hooks/useCapabilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Copy for the "How group parayanam works" help panel. Kept in one place so it is easy to tweak after review.
const STATUS_LABEL: Record<ParticipantStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
  left: "Left",
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

function formatDate(d: string | null) {
  return d
    ? new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groups: myGroups } = useGroups();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);

  const [target, setTarget] = useState<number | null>(null);
  const [dashakamNumbers, setDashakamNumbers] = useState<number[] | undefined>(undefined);
  const [sessionStartDate, setSessionStartDate] = useState<string | null>(null);
  const [sessionFinalizedAt, setSessionFinalizedAt] = useState<string | null>(null);
  const [parayanamName, setParayanamName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [scheduleRowCount, setScheduleRowCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [membersOpen, setMembersOpen] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [parayanamMembersOpen, setParayanamMembersOpen] = useState(false);
  const [manageParayanamOpen, setManageParayanamOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const sessionParam = searchParams.get("session");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionParam);
  const [pickerTouched, setPickerTouched] = useState(!!sessionParam);
  // Owner-only garden view toggle: "mine" = personal garden, "group" = group-aggregate garden.
  const [ownerGardenView, setOwnerGardenView] = useState<"mine" | "group">("mine");

  const { parayanams, loading: loadingParayanams, refresh: refreshParayanams } = useGroupParayanams(groupId);
  const { members, loading: loadingMembers, refresh: refreshMembers } = useGroupMembers(groupId, selectedSessionId);
  const {
    blooms: gardenBlooms,
    tiles: gardenTiles,
    dashakamNumbers: gardenDashakams,
    loading: gardenLoading,
    pending: gardenPending,
    refresh: refreshGarden,
    toggleDashakam,
  } = useSessionGarden(selectedSessionId);
  // Personal garden for non-owner participants: blooms reflect only the
  // signed-in user's own completions.
  const {
    blooms: myBlooms,
    tiles: myTiles,
    dashakamNumbers: myDashakams,
    loading: myGardenLoading,
    pending: myGardenPending,
    toggleDashakam: toggleMyDashakam,
  } = useMyDashakamGarden(selectedSessionId);
  const {
    participants,
    loading: loadingParticipants,
    statusFor,
    refresh: refreshParticipants,
  } = useSessionParticipants(selectedSessionId);

  // FREE vs PAID decides how strict participation eligibility is.
  const [selectedParticipationType, setSelectedParticipationType] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!selectedSessionId) {
      setSelectedParticipationType(null);
      return;
    }
    void (async () => {
      const { data } = await (supabase as any)
        .from("challenge_sessions")
        .select("participation_type")
        .eq("id", selectedSessionId)
        .maybeSingle();
      if (!cancelled) setSelectedParticipationType((data as any)?.participation_type ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId]);

  // Default selection: the group's active pointer when it is in the list,
  // otherwise the most recent parayanam. Explicit picks always win afterwards.
  useEffect(() => {
    if (loadingParayanams) return;
    if (!parayanams.length) {
      setSelectedSessionId(null);
      return;
    }
    // A cancelled parayanam disappears from the list — fall back at once so
    // the page never keeps showing something that is no longer visible.
    const stillThere = !!selectedSessionId && parayanams.some((p) => p.session_id === selectedSessionId);
    if (pickerTouched && stillThere) return;

    if (sessionParam && parayanams.some((p) => p.session_id === sessionParam)) {
      setSelectedSessionId(sessionParam);
      return;
    }

    const active = group?.active_challenge_session_id;
    const fallback = parayanams[0].session_id;
    setSelectedSessionId(active && parayanams.some((p) => p.session_id === active) ? active : fallback);
  }, [
    parayanams,
    loadingParayanams,
    group?.active_challenge_session_id,
    pickerTouched,
    selectedSessionId,
    sessionParam,
  ]);

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
  }, [groupId, refreshKey]);

  useEffect(() => {
    const sessionId = selectedSessionId;
    if (!sessionId) {
      setTarget(null);
      setSessionStartDate(null);
      setSessionFinalizedAt(null);
      setParayanamName(null);
      setDashakamNumbers(undefined);
      return;
    }
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

      // The generated schedule is also the fallback source of the dashakam
      // list (dashakam_list can be null when a saved set was used), and its
      // row count tells us whether a schedule exists at all.
      const { data: rows } = await (supabase as any)
        .from("parayanam_schedule")
        .select("dashakam_no")
        .eq("challenge_session_id", sessionId);
      if (cancelled) return;
      setScheduleRowCount(((rows ?? []) as any[]).length);
      if (!list.length) {
        list = Array.from(
          new Set(((rows ?? []) as any[]).map((r) => Number(r.dashakam_no)).filter((n) => Number.isFinite(n))),
        ).sort((a, b) => a - b);
      }

      setDashakamNumbers(list.length ? list : undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSessionId, refreshKey]);

  const isOwner = !!user && !!group && group.owner_id === user.id;
  const { canCreateParayanam, canManageParayanam } = useCapabilities();

  // Guru identity for the header and the group picker: profiles of this group's
  // owner plus every owner across the user's groups (one batched query).
  const [ownerProfiles, setOwnerProfiles] = useState<
    Record<string, { display_name: string | null; email: string | null }>
  >({});

  useEffect(() => {
    const ids = Array.from(
      new Set([group?.owner_id, ...myGroups.map((g) => g.owner_id)].filter((v): v is string => !!v)),
    );
    if (!ids.length) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
      if (!cancelled && data) {
        setOwnerProfiles(
          Object.fromEntries(
            (data as any[]).map((p) => [p.id, { display_name: p.display_name ?? null, email: p.email ?? null }]),
          ),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.owner_id, myGroups]);

  /** "Vidya" / falls back to email; never duplicated when the name is the email. */
  const guruNameOf = (profile?: { display_name: string | null; email: string | null } | null) =>
    profile?.display_name?.trim() || profile?.email || "Guru";
  const guruEmailOf = (profile?: { display_name: string | null; email: string | null } | null) =>
    profile?.email?.trim() || null;

  const ownerProfile = group ? ownerProfiles[group.owner_id] : undefined;
  const guruLabel = isOwner
    ? `You${guruEmailOf(ownerProfile) ? ` — ${guruEmailOf(ownerProfile)}` : ""}`
    : [guruNameOf(ownerProfile), guruEmailOf(ownerProfile) !== guruNameOf(ownerProfile) ? guruEmailOf(ownerProfile) : null]
        .filter(Boolean)
        .join(" — ");

  // Only people with a relationship to the selected parayanam (invited, confirmed
  // or declined) — plus the owner, who runs it — may see its progress.
  const hasSession = !!selectedSessionId;
  // A participant row alone is not access: invited, declined, left or a PAID
  // member awaiting the Guru's contribution approval must stay locked out.
  const isParayanamParticipant =
    isOwner ||
    (!!user &&
      participants.some((p) =>
        isParticipantEligible(p, selectedParticipationType),
      ));
  const canSeeParayanamData = !hasSession || isParayanamParticipant;

  // Prefer the live schedule the garden loaded; fall back to the session's list.
  const gardenNumbers = gardenDashakams.length ? gardenDashakams : (dashakamNumbers ?? []);
  const myGardenNumbers = myDashakams.length ? myDashakams : (dashakamNumbers ?? []);

  /** A completion write must refresh the garden, its header count, the schedule views and the member counts together. */
  const handleTapDashakam = async (dashakamNo: number) => {
    await toggleDashakam(dashakamNo);
    setRefreshKey((k) => k + 1);
    await refreshMembers();
  };
  const handleTapMyDashakam = async (dashakamNo: number) => {
    await toggleMyDashakam(dashakamNo);
    setRefreshKey((k) => k + 1);
    await refreshMembers();
  };

  const selectedParayanam = parayanams.find((p) => p.session_id === selectedSessionId) ?? null;

  /** Any parayanam-level change should refetch the whole panel together. */
  const handleParayanamChanged = async () => {
    setRefreshKey((k) => k + 1);
    await Promise.all([refreshParticipants(), refreshMembers(), refreshGarden(), refreshParayanams()]);
  };

  const isRelaySession =
    deriveDistributionMode(selectedParayanam?.distribution_mode, selectedParayanam?.challenge_type) === "RELAY";
  const confirmedParticipantCount = participants.filter((p) => p.status === "confirmed").length;
  /** A relay needs at least one confirmed reader before blocks can be handed out. */
  const relayNeedsConfirmation = isRelaySession && confirmedParticipantCount === 0;

  const canStartNow = isOwner && !!selectedSessionId && !sessionFinalizedAt;

  const handleStartNow = async () => {
    if (!selectedSessionId || relayNeedsConfirmation) return;
    setStarting(true);
    const { error } = await (supabase as any).rpc("finalize_parayanam", {
      p_session_id: selectedSessionId,
    });
    setStarting(false);
    if (error) {
      toast({ title: "Could not start the parayanam", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Parayanam started", description: "The day-by-day schedule is ready." });
    setRefreshKey((k) => k + 1);
    await Promise.all([refreshGarden(), refreshParayanams()]);
  };

  /**
   * A non-relay parayanam that somehow has no schedule rows (created before the
   * schedule was generated) can be repaired with the same backend generator.
   */
  const canGenerateMissingSchedule = isOwner && !!selectedSessionId && !isRelaySession && scheduleRowCount === 0;

  const handleGenerateMissingSchedule = async () => {
    if (!selectedSessionId) return;
    setStarting(true);
    const { error } = await (supabase as any).rpc("finalize_parayanam", {
      p_session_id: selectedSessionId,
    });
    setStarting(false);
    if (error) {
      toast({ title: "Could not generate the schedule", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Schedule generated", description: "The day-by-day schedule is ready." });
    setRefreshKey((k) => k + 1);
    await Promise.all([refreshGarden(), refreshParayanams()]);
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
          {myGroups.length > 1 && (
            <div className="mt-4 max-w-md">
              <label className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Your groups</label>
              <Select value={group.id} onValueChange={(v) => navigate(`/groups/${v}`)}>
                <SelectTrigger className="mt-1 font-sans text-sm">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {myGroups.map((g) => {
                    const op = ownerProfiles[g.owner_id];
                    const name = guruNameOf(op);
                    const email = guruEmailOf(op);
                    const label = [g.group_name, name, email && email !== name ? email : null]
                      .filter(Boolean)
                      .join(" — ");
                    return (
                      <SelectItem key={g.id} value={g.id} className="font-sans text-sm">
                        <span className="block max-w-[46vw] truncate sm:max-w-[320px]">{label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">Group: {group.group_name}</h1>
              <p className="font-sans text-xs text-muted-foreground">Guru: {guruLabel}</p>
              <p className="font-sans text-xs text-muted-foreground">
                {isOwner ? "You are the Guru of this group." : "You are a member of this group."}
              </p>
              <p className="font-sans text-sm text-muted-foreground">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
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
                            <span
                              className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none"
                              aria-hidden="true"
                            >
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
                <p className="mt-5 text-center font-sans text-xs text-muted-foreground">{HELP_COPY.closing}</p>
              </DialogContent>
            </Dialog>
          </div>

          <PendingInvitesSection groupId={groupId} />

          {/* Parayanam-specific panels live below the divider further down. */}

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
              <p className="mt-3 font-sans text-sm text-muted-foreground">No members yet.</p>
            ) : !isOwner ? (
              <p className="mt-3 font-sans text-sm text-muted-foreground">{members.length} members in this group.</p>
            ) : (
              <ul className="mt-4 max-h-[260px] space-y-3 overflow-y-auto pr-2">
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
                      <p className="font-sans text-xs text-muted-foreground">
                        Joined{" "}
                        {new Date(m.joined_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-6">
            <Link
              to={`/groups/${group.id}/settings`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <Settings className="h-4 w-4" /> Manage Group
            </Link>
            <Link
              to={`/my-parayanams?group=${group.id}`}
              className="ml-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-primary hover:text-foreground"
            >
              <BarChart3 className="h-4 w-4" /> Group report
            </Link>
          </div>

          {/* ── Divider: everything below belongs to one chosen parayanam ── */}
          <div className="mt-8 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="font-sans text-xs uppercase tracking-wide text-muted-foreground">Parayanams</span>
            <Separator className="flex-1" />
          </div>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-peacock">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold text-foreground">Choose a parayanam</h2>
                <p className="mt-1 font-sans text-sm text-muted-foreground">
                  This group can run several parayanams at once. Pick one to see its garden and schedule.
                </p>
                {loadingParayanams ? (
                  <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
                ) : parayanams.length === 0 ? (
                  <p className="mt-3 font-sans text-sm text-muted-foreground">
                    {isOwner
                      ? "No parayanams yet — add one to get started."
                      : "You're not confirmed in any of this group's parayanams yet. Once you accept an invite, it will appear here."}
                  </p>
                ) : (
                  <div className="mt-3 max-w-md">
                    <Select
                      value={selectedSessionId ?? undefined}
                      onValueChange={(v) => {
                        setPickerTouched(true);
                        setSelectedSessionId(v);
                        setParayanamMembersOpen(false);
                        setRefreshKey((k) => k + 1);
                      }}
                    >
                      <SelectTrigger className="font-sans text-sm">
                        <SelectValue placeholder="Select a parayanam" />
                      </SelectTrigger>
                      <SelectContent>
                        {parayanams.map((p) => (
                          <SelectItem key={p.session_id} value={p.session_id}>
                            {parayanamLabel(p)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {isOwner && canCreateParayanam && (
                <Link
                  to={`/parayanam/new?group=${group.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> Add a Parayanam
                </Link>
              )}
            </div>
          </section>

          <ParayanamDraftsList groupId={group.id} enabled={isOwner} />

          {selectedSessionId && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <h2 className="font-display text-xl font-bold text-foreground">
                Parayanam: {parayanamName || "Parayanam"}
              </h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {selectedParayanam
                  ? `${formatDate(selectedParayanam.start_date)} – ${formatDate(selectedParayanam.end_date)}`
                  : "Dates will appear once this parayanam is planned."}
              </p>

              {(isOwner || canSeeParayanamData) && (
                <ParayanamLiveSessionsSection
                  challengeSessionId={selectedSessionId}
                  isOwner={isOwner}
                  onManage={isOwner && canManageParayanam ? () => setManageParayanamOpen(true) : undefined}
                />
              )}

              {isOwner && (
                <>
                  {loadingMembers || loadingParticipants ? (
                    <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <div className="mt-4 rounded-xl border border-border">
                      <button
                        type="button"
                        onClick={() => setParayanamMembersOpen((v) => !v)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                        aria-expanded={parayanamMembersOpen}
                      >
                        <span className="font-sans text-sm font-semibold text-foreground">
                          Group members & Parayanam status ({members.length})
                        </span>

                        {parayanamMembersOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>

                      {parayanamMembersOpen && (
                        <div className="border-t border-border px-4 pb-4">
                          <ul className="mt-3 max-h-[320px] space-y-3 overflow-y-auto pr-2">
                            {members.map((m) => (
                              <li key={m.id} className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-peacock font-sans text-xs font-bold text-primary-foreground">
                                  {initials(m.display_name)}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-sans text-sm font-semibold text-foreground">
                                    {m.display_name}
                                  </p>

                                  <p className="flex flex-wrap items-center gap-2 font-sans text-xs text-muted-foreground">
                                    <span>
                                      {m.completed}
                                      {target ? ` / ${target}` : ""} dashakams completed
                                    </span>

                                    <span
                                      className={
                                        statusFor(m.user_id) === "confirmed"
                                          ? "rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground"
                                          : "rounded-full border border-primary/50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary"
                                      }
                                    >
                                      {statusFor(m.user_id) ? STATUS_LABEL[statusFor(m.user_id)!] : "Not invited"}
                                    </span>
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* WEB + TWA: invite and manage participants */}
                  <ParayanamParticipantManager sessionId={selectedSessionId} isOwner={isOwner} />

                  {/* WEB ONLY: edit Parayanam and manage schedule */}
                  {canManageParayanam && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <ManageParayanamDialog
                        groupId={group.id}
                        sessionId={selectedSessionId}
                        parayanamName={parayanamName}
                        finalized={!!sessionFinalizedAt}
                        members={members}
                        ownerId={group.owner_id}
                        isOwner={isOwner}
                        participants={participants}

                        onChanged={handleParayanamChanged}
                        open={manageParayanamOpen}
                        onOpenChange={setManageParayanamOpen}
                      />

                      <Link
                        to={`/groups/${group.id}/schedule?session=${selectedSessionId}`}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
                      >
                        <CalendarDays className="h-4 w-4" />
                        Manage schedule
                      </Link>
                    </div>
                  )}

                  {/* WEB + TWA: start an existing Parayanam */}
                  {canStartNow && (
                    <div className="mt-5">
                      <button
                        onClick={handleStartNow}
                        disabled={starting || relayNeedsConfirmation}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-sans text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                      >
                        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                        Start parayanam now
                      </button>
                    </div>
                  )}

                  {/* Repair path: a non-relay parayanam with no schedule rows yet */}
                  {canGenerateMissingSchedule && !canStartNow && (
                    <div className="mt-5">
                      <button
                        onClick={handleGenerateMissingSchedule}
                        disabled={starting}
                        className="inline-flex items-center gap-2 rounded-lg border border-primary px-4 py-2 font-sans text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                      >
                        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                        Generate schedule
                      </button>
                      <p className="mt-2 font-sans text-sm text-muted-foreground">
                        This parayanam has no day-by-day schedule yet. Generating it makes My schedule available to
                        everyone taking part.
                      </p>
                    </div>
                  )}



                  {canStartNow && relayNeedsConfirmation && (
                    <p className="mt-2 font-sans text-sm text-muted-foreground">
                      Waiting for at least one participant to confirm — a relay parayanam can only be started once
                      someone has accepted their invitation.
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          {!selectedSessionId && !loadingParayanams && isOwner && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <h2 className="font-display text-lg font-semibold text-foreground">No parayanam yet</h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                Add a parayanam to plan the dashakams, invite members and watch the garden bloom.
              </p>
            </section>
          )}

          {selectedSessionId && (
            <>
              <div className="mt-6">
                {loadingParticipants ? (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : !canSeeParayanamData ? (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                    <h2 className="font-display text-xl font-bold text-foreground">Parayanam Dashakam Garden</h2>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      You're not part of this parayanam. The garden will bloom for you once you're invited to join one.
                    </p>
                  </div>
                ) : (gardenNumbers.length > 0 || myGardenNumbers.length > 0) ? (
                  isOwner ? (
                    <>
                      <div className="mb-3 flex gap-2">
                        {(
                          [
                            ["mine", "My Garden"],
                            ["group", "Group Garden"],
                          ] as const
                        ).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setOwnerGardenView(value)}
                            aria-pressed={ownerGardenView === value}
                            className={cn(
                              "rounded-full border px-4 py-1.5 font-sans text-sm transition-colors",
                              ownerGardenView === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {ownerGardenView === "group" ? (
                        <DashakamGarden
                          blooms={gardenBlooms}
                          dashakamNumbers={gardenNumbers}
                          tiles={gardenTiles}
                          onTapDashakam={handleTapDashakam}
                          pendingDashakam={gardenPending}
                          title="Parayanam Dashakam Garden"
                          subtitle={parayanamName || undefined}
                          loading={gardenLoading}
                        />
                      ) : (
                        <>
                          <DashakamGarden
                            blooms={myBlooms}
                            dashakamNumbers={myGardenNumbers}
                            tiles={myTiles}
                            onTapDashakam={handleTapMyDashakam}
                            pendingDashakam={myGardenPending}
                            title="My Parayanam Garden"
                            subtitle={parayanamName || undefined}
                            loading={myGardenLoading}
                          />
                          <FeatherCollection tiles={myTiles} />
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <DashakamGarden
                        blooms={myBlooms}
                        dashakamNumbers={myGardenNumbers}
                        tiles={myTiles}
                        onTapDashakam={handleTapMyDashakam}
                        pendingDashakam={myGardenPending}
                        title="My Parayanam Garden"
                        subtitle={parayanamName || undefined}
                        loading={myGardenLoading}
                      />
                      <FeatherCollection tiles={myTiles} />
                    </>
                  )
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-5 shadow-peacock">
                    <h2 className="font-display text-xl font-bold text-foreground">Parayanam Dashakam Garden</h2>
                    <p className="mt-1 font-sans text-sm text-muted-foreground">
                      The day-by-day schedule is prepared automatically when this parayanam begins.
                    </p>
                  </div>
                )}
              </div>

              {canSeeParayanamData && (
                <ParayanamScheduleViews challengeSessionId={selectedSessionId} refreshKey={refreshKey} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
