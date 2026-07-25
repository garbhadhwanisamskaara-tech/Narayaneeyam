import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logoImg from "@/assets/logo.png";
import SEO from "@/components/SEO";

/**
 * Public landing for group invite links: /join/:token
 * Stage 1: validate token, show preview. If signed in → join flow (Phase 3).
 * If signed out → bounce to /auth?next=/join/:token.
 */
export default function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "invalid" | "ready">("loading");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_invite_preview", {
          invite_token: token,
        });

        if (cancelled) return;
        const preview = Array.isArray(data) ? data[0] : data;
        if (!error && preview?.valid) {
          setGroupName(preview.group_name ?? "a group");
          setStatus("ready");
        } else {
          setStatus("invalid");
        }
      } catch {
        if (!cancelled) setStatus("invalid");
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleContinue = async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/join/${token}`)}`, { replace: true });
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const { data, error } = await (supabase as any).rpc("accept_group_invite", {
        invite_token: token,
      });
      if (error) throw error;
      const groupId = Array.isArray(data) ? data[0]?.group_id ?? data[0] : data;
      if (!groupId) throw new Error("Could not join this group.");
      navigate(`/groups/${groupId}`, { replace: true });
    } catch (e: any) {
      setJoinError(e?.message ?? "Could not join this group. Please try again.");
    } finally {
      setJoining(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO path={`/join/${token}`} title="Join Parayanam Group — Sriman Narayaneeyam" description="You've been invited to join a group parayanam." />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-peacock text-center">
        <img src={logoImg} alt="" className="mx-auto h-16 w-16 rounded-full mb-4" />
        {status === "loading" || loading ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            <p className="mt-3 font-sans text-sm text-muted-foreground">Checking invite…</p>
          </>
        ) : status === "invalid" ? (
          <>
            <h1 className="font-display text-xl font-bold text-foreground">Invite not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans">
              This invite link has expired or doesn't exist. Please ask the group owner for a fresh link.
            </p>
            <Link to="/" className="mt-6 inline-block rounded-lg bg-gradient-peacock px-4 py-2 text-sm font-sans font-semibold text-primary-foreground">Go Home</Link>
          </>
        ) : (
          <>
            <Users className="h-6 w-6 mx-auto text-primary mb-2" />
            <h1 className="font-display text-xl font-bold text-foreground">Join {groupName}</h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans">
              You've been invited to chant Narayaneeyam together.
            </p>
            <button onClick={handleContinue} className="mt-6 w-full rounded-lg bg-gradient-peacock px-4 py-2 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90">
              {user ? "Join Group" : "Sign in to Join"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
