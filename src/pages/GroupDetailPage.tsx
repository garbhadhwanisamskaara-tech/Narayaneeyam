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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupInvite, useGroupMembers, inviteLink, type Group } from "@/hooks/useGroups";
import SEO from "@/components/SEO";
import DashakamGarden from "@/components/DashakamGarden";
import { useGroupGarden } from "@/hooks/useGarden";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [target, setTarget] = useState<number | null>(null);

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
      ) : (
        <>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{group.group_name}</h1>

          {isOwner && (
            <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
              <h2 className="font-display text-lg font-semibold text-foreground">Parayanam Schedule</h2>
              <p className="mt-1 font-sans text-sm text-muted-foreground">
                {group.active_challenge_session_id
                  ? "Review or reassign the dashakams for your group."
                  : "Choose a dashakam set, a timeline and how the dashakams are shared."}
              </p>
              <Link
                to={`/groups/${group.id}/schedule`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <CalendarDays className="h-4 w-4" />
                {group.active_challenge_session_id ? "Manage schedule" : "Plan parayanam"}
              </Link>
            </section>
          )}

          <div className="mt-6">
            <DashakamGarden
              blooms={gardenBlooms}
              title="Group Dashakam Garden"
              loading={gardenLoading}
            />
          </div>

          <GroupBloomsSection groupId={groupId} isOwner={isOwner} />



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
        </>
      )}
    </div>
  );
}
