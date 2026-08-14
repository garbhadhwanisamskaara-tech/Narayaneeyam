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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupInvite, useGroupMembers, inviteLink, type Group } from "@/hooks/useGroups";
import SEO from "@/components/SEO";
import DashakamGarden from "@/components/DashakamGarden";
import { useGroupGarden } from "@/hooks/useGarden";
import GroupBloomsSection from "@/components/GroupBloomsSection";
import GroupDangerZone from "@/components/GroupDangerZone";
import PendingInvitesSection from "@/components/PendingInvitesSection";
import PushRemindersPrompt from "@/components/PushRemindersPrompt";
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
      { icon: "📋", title: "Plan", subtitle: "Dashakams, dates, Sync or Split" },
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
  const [helpOpen, setHelpOpen] = useState(false);

  const { invite, loading, generateInvite, revokeInvite, regenerateInvite } = useGroupInvite(groupId);
  const {
    members,
    loading: loadingMembers,
    removeMember,
  } = useGroupMembers(groupId, group?.active_challenge_session_id);
  const { blooms: gardenBlooms, loading: gardenLoading } = useGroupGarden(groupId);
  const { statusFor } = useSessionParticipants(group?.active_challenge_session_id);



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
        .select("dashakams_target")
        .eq("id", sessionId)
        .maybeSingle();
      if (!cancelled) setTarget(data?.dashakams_target ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [group?.active_challenge_session_id]);

  const isOwner = !!user && !!group && group.owner_id === user.id;
  const ownerMember = members.find((m) => m.user_id === group?.owner_id);
  const ownerName = ownerMember?.display_name ?? null;

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
            <h1 className="font-display text-2xl font-bold text-foreground">{group.group_name}</h1>
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
              <h2 className="font-display text-lg font-semibold text-foreground">Parayanam Schedule</h2>
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
              </div>
            </section>
          )}

          <div className="mt-6">
            <DashakamGarden
              blooms={gardenBlooms}
              title="Group Dashakam Garden"
              loading={gardenLoading}
            />
          </div>

          <GroupBloomsSection
            groupId={groupId}
            isOwner={isOwner}
            activeChallengeSessionId={group.active_challenge_session_id}
            ownerName={ownerName}
          />




          <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
            <h2 className="font-display text-lg font-semibold text-foreground">Members</h2>
            {loadingMembers ? (
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
                        {group.active_challenge_session_id && (
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
            {members.length === 1 && (
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

          <GroupDangerZone groupId={group.id} groupName={group.group_name} isOwner={isOwner} />

        </>
      )}
    </div>
  );
}
