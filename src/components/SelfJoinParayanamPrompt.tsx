import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HandCoins, Loader2, Sparkles, X } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useParayanamPayment } from "@/hooks/useParayanamPayment";

interface Discoverable {
  session_id: string;
  parayanam_name: string;
  group_id: string;
  group_name: string;
  participation_type: "FREE" | "PAID";
  contribution_amount: number | null;
}

export default function SelfJoinParayanamPrompt() {
  const { user } = useAuth();
  const [items, setItems] = useState<Discoverable[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any).rpc("get_discoverable_parayanams_for_me");
    setItems((data ?? []) as Discoverable[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = (sessionId: string) => {
    setItems((prev) => prev.filter((i) => i.session_id !== sessionId));
  };

  if (!user || loading || items.length === 0) return null;

  return (
    <div className="mb-8 space-y-3">
      {items.map((item) => (
        <SelfJoinCard key={item.session_id} item={item} onResolved={() => remove(item.session_id)} />
      ))}
    </div>
  );
}

function SelfJoinCard({ item, onResolved }: { item: Discoverable; onResolved: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pay } = useParayanamPayment();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyAcceptedPending, setAlreadyAcceptedPending] = useState(false);

  // On mount, check whether the user already accepted this parayanam and is
  // only waiting to complete their contribution — such members skip the join
  // step entirely and go straight to payment.
  useEffect(() => {
    let cancelled = false;
    const checkOwnRow = async () => {
      if (!user) return;
      const { data } = await (supabase as any)
        .from("parayanam_participants")
        .select("status, contribution_status")
        .eq("challenge_session_id", item.session_id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && data?.status === "confirmed" && data?.contribution_status === "pending") {
        setAlreadyAcceptedPending(true);
      }
    };
    void checkOwnRow();
    return () => {
      cancelled = true;
    };
  }, [user, item.session_id]);

  const decline = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await (supabase as any)
        .from("parayanam_self_join_dismissals")
        .insert({ user_id: user.id, challenge_session_id: item.session_id });
    } catch (e) {
      console.error("Could not record dismissal", e);
    } finally {
      setBusy(false);
      onResolved();
    }
  };

  const accept = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const { data: joinData, error: joinErr } = await supabase.functions.invoke("self-join-parayanam", {
        body: { session_id: item.session_id },
      });
      if (joinErr || joinData?.error) {
        throw new Error(joinData?.error || joinErr?.message || "Could not join this parayanam");
      }

      if (item.participation_type === "PAID") {
        await pay(item.session_id, {
          onPaid: () => {
            setBusy(false);
            onResolved();
            navigate(`/groups/${item.group_id}?session=${item.session_id}`);
          },
          onError: (message) => {
            setBusy(false);
            setError(message);
          },
        });
        return;
      }

      setBusy(false);
      onResolved();
      navigate(`/groups/${item.group_id}?session=${item.session_id}`);
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Could not join this parayanam. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-5"
    >
      <div className="flex items-start gap-4">
        <Sparkles className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-foreground">Join {item.parayanam_name}?</p>
          <p className="mt-1 text-sm text-muted-foreground font-sans">
            {item.group_name}
            {item.participation_type === "PAID" && item.contribution_amount != null
              ? ` · Contribution ₹${item.contribution_amount}`
              : " · Free to join"}
          </p>
          {error && <p className="mt-2 text-sm text-destructive font-sans">{error}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void accept()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : item.participation_type === "PAID" ? (
                <HandCoins className="h-4 w-4" />
              ) : null}
              {item.participation_type === "PAID" ? `Yes, Pay ₹${item.contribution_amount ?? ""}` : "Yes, Join"}
            </button>
            <button
              onClick={() => void decline()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> No
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
