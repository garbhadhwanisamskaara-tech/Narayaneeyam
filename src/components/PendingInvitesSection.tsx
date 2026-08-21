import { useState } from "react";
import { Check, Loader2, MailQuestion, X } from "lucide-react";
import { useMyPendingInvites } from "@/hooks/useParayanamParticipants";
import PushRemindersPrompt from "@/components/PushRemindersPrompt";
import { track } from "@/lib/analytics";

const NUDGE_KEY = "push-nudge-shown";

/** Invites to group parayanams that are waiting for the current user's answer. */
export default function PendingInvitesSection({ groupId }: { groupId?: string }) {
  const { invites, loading, busyId, respond } = useMyPendingInvites();
  const [error, setError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);

  const list = groupId ? invites.filter((i) => i.group_id === groupId) : invites;

  const answer = async (id: string, status: "confirmed" | "declined") => {
    setError(null);
    try {
      await respond(id, status);
      if (status === "confirmed") track("parayanam_joined");
      // A one-time nudge the first time someone joins a parayanam — reminders are
      // an account-level setting, so we never repeat this on every group page.
      if (status === "confirmed" && localStorage.getItem(NUDGE_KEY) !== "1") {
        localStorage.setItem(NUDGE_KEY, "1");
        setShowNudge(true);
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not save your answer. Please try again.");
    }
  };

  if (loading || (list.length === 0 && !showNudge)) return null;
  if (list.length === 0) return <PushRemindersPrompt />;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
        <MailQuestion className="h-5 w-5 text-primary" /> Pending invites
      </h2>
      <ul className="mt-4 space-y-3">
        {list.map((i) => (
          <li
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
          >
            <div className="min-w-0">
              <p className="font-sans text-sm font-semibold text-foreground">
                {i.group_name ?? "A parayanam"}
              </p>
              <p className="font-sans text-xs text-muted-foreground">
                {i.dashakams_target ? `${i.dashakams_target} dashakams` : "Parayanam"}
                {i.start_date ? ` · from ${i.start_date}` : ""}
                {i.end_date ? ` to ${i.end_date}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void answer(i.id, "confirmed")}
                disabled={busyId === i.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busyId === i.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Accept
              </button>
              <button
                onClick={() => void answer(i.id, "declined")}
                disabled={busyId === i.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" /> Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 font-sans text-sm text-destructive">{error}</p>}
      {showNudge && <PushRemindersPrompt />}
    </section>
  );
}
