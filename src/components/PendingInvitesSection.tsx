import { useState } from "react";
import { Check, Loader2, MailQuestion, X } from "lucide-react";
import { useMyPendingInvites, type PendingInvite } from "@/hooks/useParayanamParticipants";
import ParayanamInviteCard, { AwaitingContributionCard } from "@/components/ParayanamInviteCard";
import PushRemindersPrompt from "@/components/PushRemindersPrompt";
import { track } from "@/lib/analytics";

const NUDGE_KEY = "push-nudge-shown";

/** Invites to group parayanams that are waiting for the current user's answer. */
export default function PendingInvitesSection({ groupId }: { groupId?: string }) {
  const { invites, loading, busyId, respond } = useMyPendingInvites();
  const [error, setError] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [awaiting, setAwaiting] = useState<PendingInvite[]>([]);

  const list = groupId ? invites.filter((i) => i.group_id === groupId) : invites;

  const answer = async (id: string, status: "confirmed" | "declined") => {
    setError(null);
    const invite = list.find((i) => i.id === id);
    try {
      await respond(id, status);
      if (status === "confirmed" && invite?.participation_type === "PAID") {
        setAwaiting((prev) => [...prev, invite]);
      }
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

  const awaitingList = groupId ? awaiting.filter((i) => i.group_id === groupId) : awaiting;

  if (loading || (list.length === 0 && awaitingList.length === 0 && !showNudge)) return null;
  if (list.length === 0 && awaitingList.length === 0) return <PushRemindersPrompt />;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
        <MailQuestion className="h-5 w-5 text-primary" /> Pending invites
      </h2>
      <ul className="mt-4 space-y-3">
        {list.map((i) => (
          <li key={i.id}>
            <ParayanamInviteCard
              invite={i}
              busy={busyId === i.id}
              onAccept={() => void answer(i.id, "confirmed")}
              onDecline={() => void answer(i.id, "declined")}
            />
          </li>
        ))}
        {awaitingList.map((i) => (
          <li key={`awaiting-${i.id}`}>
            <AwaitingContributionCard invite={i} />
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 font-sans text-sm text-destructive">{error}</p>}
      {showNudge && <PushRemindersPrompt />}
    </section>
  );
}
