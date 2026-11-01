import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flower2, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WaitingParayanam {
  id: string;
  parayanam_name: string | null;
  start_date: string | null;
  end_date: string | null;
}

const shortDate = (ymd: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${ymd.slice(0, 10)}T00:00:00Z`),
  );

/**
 * Home card for the user's own (personal) parayanams: lists the ones waiting for
 * Guru's approval and offers to create a new one. Unlocked ones are not listed here;
 * their garden appears in the home garden section.
 */
export default function OwnParayanamCard() {
  const { user, unlockedOwnParayanams } = useAuth();
  const [waiting, setWaiting] = useState<WaitingParayanam[]>([]);
  const unlockedKey = unlockedOwnParayanams.join(",");

  useEffect(() => {
    if (!user) {
      setWaiting([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("challenge_sessions")
          .select("id, parayanam_name, start_date, end_date")
          .eq("user_id", user.id)
          .is("group_id", null)
          .in("approval_status", ["pending", "approved"])
          .eq("technical_state", "ACTIVE")
          .is("cancelled_at", null)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const unlocked = new Set(unlockedKey ? unlockedKey.split(",") : []);
        const rows = ((data ?? []) as WaitingParayanam[]).filter((r) => !unlocked.has(r.id));
        if (!cancelled) setWaiting(rows);
      } catch {
        if (!cancelled) setWaiting([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, unlockedKey]);

  if (!user) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex items-start gap-4">
        <Flower2 className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-base font-semibold text-foreground">Your own parayanam</p>

          {waiting.length > 0 && (
            <ul className="mt-3 space-y-2">
              {waiting.map((p) => (
                <li key={p.id} className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className="font-sans text-sm font-semibold text-foreground break-words">
                    {p.parayanam_name || "My parayanam"}
                  </p>
                  {p.start_date && (
                    <p className="font-sans text-xs text-muted-foreground">
                      {shortDate(p.start_date)}
                      {p.end_date ? ` – ${shortDate(p.end_date)}` : ""}
                    </p>
                  )}
                  <p className="mt-1 inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-primary">
                    <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                    Awaiting Guru's approval
                  </p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            <Link
              to="/parayanam/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Create your own parayanam
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
