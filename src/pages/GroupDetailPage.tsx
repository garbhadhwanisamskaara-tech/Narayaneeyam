import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Loader2, RefreshCw, Share2, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupInvite, inviteLink, type Group } from "@/hooks/useGroups";
import SEO from "@/components/SEO";

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { invite, loading, generateInvite, revokeInvite, regenerateInvite } = useGroupInvite(groupId);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("groups")
        .select("id, name, owner_id, created_at")
        .eq("id", groupId)
        .maybeSingle();
      if (!cancelled) {
        setGroup((data ?? null) as Group | null);
        setLoadingGroup(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

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
      await navigator.clipboard.writeText(`https://${inviteLink(invite.token)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError("Could not copy — please copy the link manually.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <SEO path={`/groups/${groupId}`} title="Group Parayanam — Sriman Narayaneeyam" description="Chant Narayaneeyam together with your group." />
      <Link to="/groups" className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All groups
      </Link>

      {loadingGroup ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-primary" />
      ) : !group ? (
        <p className="mt-6 font-sans text-sm text-muted-foreground">This group could not be found.</p>
      ) : (
        <>
          <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{group.name}</h1>

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
                    <code className="flex-1 truncate font-sans text-sm text-foreground">{inviteLink(invite.token)}</code>
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
