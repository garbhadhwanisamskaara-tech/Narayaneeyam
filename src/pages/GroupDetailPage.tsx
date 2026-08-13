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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


// Copy for the "How group parayanam works" help panel. Kept in one place so it is easy to tweak after review.
const HELP_COPY = {
  owner: {
    title: "If you're the owner",
    steps: [
      "Plan a parayanam: pick a dashakam set, a date range, and whether the group is Synchronized (everyone does the same dashakam each day) or Split (dashakams are shared out across members).",
      "Invite members using the Share Invite link.",
      "Track progress from the member list and the Dashakam Garden below.",
    ],
  },
  member: {
    title: "If you're a member",
    steps: [
      "Your assigned dashakams appear as tiles you can tap.",
      "Tap a tile once you've completed that dashakam (listening or reading) to mark it done — this can't be undone automatically, so only mark it once you're actually done.",
      "The Dashakam Garden fills in as the whole group completes each dashakam — it reflects everyone's progress together, not just yours.",
    ],
  },
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
                <div className="mt-2 space-y-4">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{HELP_COPY.owner.title}</h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-sm text-muted-foreground">
                      {HELP_COPY.owner.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-semibold text-foreground">{HELP_COPY.member.title}</h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 font-sans text-sm text-muted-foreground">
                      {HELP_COPY.member.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

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
                      <p className="font-sans text-xs text-muted-foreground">
                        {group.active_challenge_session_id
                          ? `${m.completed}${target ? ` / ${target}` : ""} dashakams completed`
                          : "No active parayanam yet"}
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
