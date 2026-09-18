import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useParayanamPayment } from "@/hooks/useParayanamPayment";
import logoImg from "@/assets/logo.png";
import SEO from "@/components/SEO";

interface PendingParayanam {
  /** parayanam_participants.id -- required by respond_to_parayanam_invite. */
  participant_id: string;
  /** challenge_sessions.id -- required by the Razorpay order/pay flow. */
  challenge_session_id: string;
  participation_type: "FREE" | "PAID" | null;
}

/**
 * After joining the group, the server-side group-join trigger auto-creates a
 * parayanam invite for any of that group's live parayanams. Look for exactly
 * one still-'invited' row so the click can carry straight through to it --
 * with more than one candidate, or none, we can't guess which one the person
 * means, so the group page (with its own Pending Invites list) decides instead.
 */
async function findSinglePendingParayanam(groupId: string, userId: string): Promise<PendingParayanam | null> {
  const { data: sessions } = await (supabase as any)
    .from("challenge_sessions")
    .select("id, participation_type")
    .eq("group_id", groupId);
  const sessionIds = ((sessions ?? []) as { id: string }[]).map((s) => s.id);
  if (!sessionIds.length) return null;

  const { data: rows } = await (supabase as any)
    .from("parayanam_participants")
    .select("id, challenge_session_id")
    .eq("user_id", userId)
    .eq("status", "invited")
    .in("challenge_session_id", sessionIds);
  const invited = (rows ?? []) as { id: string; challenge_session_id: string }[];
  if (invited.length !== 1) return null;

  const session = ((sessions ?? []) as { id: string; participation_type: string | null }[]).find(
    (s) => s.id === invited[0].challenge_session_id,
  );
  return {
    participant_id: invited[0].id,
    challenge_session_id: invited[0].challenge_session_id,
    participation_type: (session?.participation_type as "FREE" | "PAID" | null) ?? null,
  };
}

/**
 * Public landing for group invite links: /join/:token
 * Stage 1: validate token, show preview. If signed in → join flow.
 * If signed out → bounce to /auth?next=/join/:token.
 * Stage 2 (single-click join+pay): once the group join lands, if it revealed
 * exactly one pending parayanam invite, carry straight through -- FREE joins
 * automatically, PAID goes straight into the Razorpay checkout -- instead of
 * dropping the person on the group page to go find and accept it themselves.
 */
export default function JoinGroupPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoJoin = searchParams.get("auto") === "1";
  const [status, setStatus] = useState<"loading" | "invalid" | "ready">("loading");
  const [groupName, setGroupName] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string | null>(null);
  const autoAttempted = useRef(false);
  const { pay } = useParayanamPayment();

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
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
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleContinue = useCallback(async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(`/join/${token}?auto=1`)}`, { replace: true });
      return;
    }
    setJoining(true);
    setJoinError(null);
    setStepLabel(null);
    try {
      const { data, error } = await (supabase as any).rpc("accept_group_invite", {
        invite_token: token,
      });
      if (error) throw error;
      const groupId = Array.isArray(data) ? (data[0]?.group_id ?? data[0]) : data;
      if (!groupId) throw new Error("Could not join this group.");

      // Single-click continuation: if the group join revealed exactly one
      // pending parayanam invite, carry straight through instead of leaving
      // the person to find and accept it themselves on the group page.
      setStepLabel("Checking for a parayanam to join…");
      let pending: PendingParayanam | null = null;
      try {
        pending = await findSinglePendingParayanam(groupId, user.id);
      } catch {
        pending = null; // best-effort -- fall back to the group page below
      }

      if (!pending) {
        navigate(`/groups/${groupId}`, { replace: true });
        return;
      }

      if (pending.participation_type === "PAID") {
        setStepLabel("Taking you to payment…");
        // pay() resolves as soon as the Razorpay modal opens, not when payment
        // completes -- keep the "joining" state alive until onPaid/onError,
        // handled in their own finally below, so the page doesn't flash back
        // to a clickable "Join Group" button underneath the open modal.
        await pay(pending.challenge_session_id, {
          onPaid: () => {
            setJoining(false);
            setStepLabel(null);
            navigate(`/groups/${groupId}?session=${pending!.challenge_session_id}`, { replace: true });
          },
          onError: () => {
            // Payment didn't complete (or the popup was dismissed) -- land on
            // the group page, where the Pending Invites card lets them retry.
            setJoining(false);
            setStepLabel(null);
            navigate(`/groups/${groupId}`, { replace: true });
          },
        });
        return;
      }

      // FREE: accept the invite outright, no separate click needed.
      setStepLabel("Joining your parayanam…");
      const { error: respondErr } = await (supabase as any).rpc("respond_to_parayanam_invite", {
        p_participant_id: pending.participant_id,
        p_status: "confirmed",
      });
      if (respondErr) {
        // Non-fatal: they're in the group either way, and can accept from there.
        console.error("Auto-accept of FREE parayanam invite failed", respondErr);
      }
      navigate(`/groups/${groupId}?session=${pending.challenge_session_id}`, { replace: true });
    } catch (e: any) {
      setJoinError(e?.message ?? "Could not join this group. Please try again.");
      setJoining(false);
      setStepLabel(null);
    }
  }, [user, token, navigate, pay]);

  // Returning from sign-in: continue the join automatically.
  useEffect(() => {
    if (!autoJoin || loading || !user || status !== "ready" || autoAttempted.current) return;
    autoAttempted.current = true;
    void handleContinue();
  }, [autoJoin, loading, user, status, handleContinue]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO
        path={`/join/${token}`}
        title="Join Parayanam Group — Sriman Narayaneeyam"
        description="You've been invited to join a group parayanam."
      />
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
            <Link
              to="/"
              className="mt-6 inline-block rounded-lg bg-gradient-peacock px-4 py-2 text-sm font-sans font-semibold text-primary-foreground"
            >
              Go Home
            </Link>
          </>
        ) : (
          <>
            <Users className="h-6 w-6 mx-auto text-primary mb-2" />
            <h1 className="font-display text-xl font-bold text-foreground">Join {groupName}</h1>
            <p className="mt-2 text-sm text-muted-foreground font-sans">
              You've been invited to chant Narayaneeyam together.
            </p>
            <button
              onClick={handleContinue}
              disabled={joining}
              className="mt-6 w-full rounded-lg bg-gradient-peacock px-4 py-2 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {joining ? (stepLabel ?? "Joining…") : user ? "Join Group" : "Sign in to Join"}
            </button>
            {joinError && <p className="mt-3 text-sm text-destructive font-sans">{joinError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
