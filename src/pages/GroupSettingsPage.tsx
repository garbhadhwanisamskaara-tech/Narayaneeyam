import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, Copy, Loader2, Pencil, RefreshCw, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEO from "@/components/SEO";
import GroupDangerZone from "@/components/GroupDangerZone";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { inviteLink, useGroupInvite, type Group } from "@/hooks/useGroups";

export default function GroupSettingsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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
        setName(((data ?? null) as Group | null)?.group_name ?? "");
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const isOwner = !!user && !!group && group.owner_id === user.id;
  const { invite, loading: inviteLoading, generateInvite, revokeInvite, regenerateInvite } = useGroupInvite(groupId);
  const handleRename = async () => {
    const trimmed = name.trim();
    if (!group || !trimmed || trimmed === group.group_name) return;
    if (trimmed.length > 60) {
      toast({ title: "Name too long", description: "Please use 60 characters or less.", variant: "destructive" });
      return;
    }
    setSavingName(true);
    const { error } = await (supabase as any).from("groups").update({ group_name: trimmed }).eq("id", group.id);
    setSavingName(false);
    if (error) {
      toast({ title: "Could not rename the group", description: error.message, variant: "destructive" });
      return;
    }
    setGroup({ ...group, group_name: trimmed });
    toast({ title: "Group renamed", description: `Now called ${trimmed}.` });
  };
  const runInviteAction = async (action: () => Promise<any>) => {
    setInviteBusy(true);
    setInviteError(null);

    try {
      await action();
    } catch (e: any) {
      setInviteError(e?.message ?? "Something went wrong.");
    } finally {
      setInviteBusy(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!invite) return;

    try {
      await navigator.clipboard.writeText(inviteLink(invite.token));
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setInviteError("Could not copy — please copy the link manually.");
    }
  };
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <SEO
        path={`/groups/${groupId}/settings`}
        title="Manage group — Sriman Narayaneeyam"
        description="Manage your group parayanam settings."
      />
      <Link
        to={`/groups/${groupId}`}
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to group
      </Link>

      {loading ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      ) : !group ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">This group could not be found.</p>
      ) : (
        <>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Manage {group.group_name}</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            Manage the group name, invitation link and other group settings.
          </p>
          {isOwner && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <Pencil className="h-4 w-4 text-muted-foreground" /> Rename group
              </h2>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Everyone in the group will see the new name.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Input
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  className="max-w-xs"
                  aria-label="Group name"
                />
                <button
                  onClick={() => void handleRename()}
                  disabled={savingName || !name.trim() || name.trim() === group.group_name}
                  className="rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {savingName ? "Saving…" : "Save name"}
                </button>
              </div>
            </section>
          )}
          {isOwner && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-base font-semibold text-foreground">Group invite link</h2>

              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Anyone with this link can join this group. Invitations to individual Parayanams are managed separately
                under Manage Parayanam.
              </p>

              {inviteLoading ? (
                <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />
              ) : invite ? (
                <>
                  <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <code className="flex-1 truncate font-sans text-sm text-foreground">
                      {inviteLink(invite.token)}
                    </code>

                    <button
                      type="button"
                      onClick={() => void handleCopyInvite()}
                      aria-label="Copy group invite link"
                      className="text-primary hover:opacity-80"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void runInviteAction(regenerateInvite)}
                      disabled={inviteBusy}
                      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary disabled:opacity-60"
                    >
                      {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Regenerate link
                    </button>

                    <button
                      type="button"
                      onClick={() => void runInviteAction(revokeInvite)}
                      disabled={inviteBusy}
                      className="inline-flex items-center gap-2 rounded-lg border border-destructive/50 px-4 py-2 font-sans text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      <Ban className="h-4 w-4" />
                      Revoke link
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void runInviteAction(generateInvite)}
                  disabled={inviteBusy}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  Create invite link
                </button>
              )}

              {inviteError && <p className="mt-3 font-sans text-sm text-destructive">{inviteError}</p>}
            </section>
          )}
          <GroupDangerZone groupId={group.id} groupName={group.group_name} isOwner={isOwner} />
        </>
      )}
    </div>
  );
}
