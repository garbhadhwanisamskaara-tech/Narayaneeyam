import { Check, Clock, Loader2, Users, X } from "lucide-react";
import type { PendingInvite } from "@/hooks/useParayanamParticipants";
import { useCapabilities } from "@/hooks/useCapabilities";
import { Button } from "@/components/ui/button";

const fmt = (d: string | null) => {
  if (!d) return null;
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

interface Props {
  invite: PendingInvite;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The member-facing invitation card for one parayanam. The meeting link is never
 * shown here — even for Live parayanams — it only appears once access is active.
 */
export default function ParayanamInviteCard({ invite: i, busy, onAccept, onDecline }: Props) {
  const live = i.delivery_mode === "LIVE";

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="font-display text-base font-semibold text-foreground">{i.parayanam_name ?? "Parayanam"}</p>
      <p className="mt-0.5 font-sans text-xs text-muted-foreground">
        Invited by {i.guru_name ?? "your Guru"}
        {i.group_name ? (
          <>
            {" · "}
            <Users className="mb-0.5 inline h-3 w-3" /> {i.group_name}
          </>
        ) : null}
      </p>

      <dl className="mt-3 space-y-1 font-sans text-xs text-muted-foreground">
        {(i.start_date || i.end_date) && (
          <div>
            <span className="text-foreground/80">Dates:</span> {fmt(i.start_date) ?? "—"}
            {i.end_date ? ` to ${fmt(i.end_date)}` : ""}
          </div>
        )}
        <div>
          <span className="text-foreground/80">Mode:</span>{" "}
          {live ? "Live — scheduled online sessions" : "Self-paced — chant at your own time"}
        </div>
        {live && i.first_session_at && (
          <div>
            <span className="text-foreground/80">First live session:</span>{" "}
            {new Date(i.first_session_at).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
        {i.general_note && <div className="italic">{i.general_note}</div>}
      </dl>

      <div className="mt-4 flex gap-2">
        <Button
          onClick={onAccept}
          disabled={busy}
          className="inline-flex h-auto items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Accept Invitation
        </Button>
        <Button
          variant="outline"
          onClick={onDecline}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-sans text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}

/** Shown after a member accepts a parayanam that needs Guru approval. */
export function AwaitingContributionCard({ invite: i }: { invite: PendingInvite }) {
  const { canViewExternalPaymentLinks } = useCapabilities();
  if (i.contribution_status === "confirmed" || i.contribution_status === "not_required") return null;

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Clock className="h-4 w-4 text-primary" /> Awaiting Guru approval
      </p>
      <p className="mt-1 font-sans text-xs text-muted-foreground">
        Your request to join {i.parayanam_name ?? "this parayanam"} has been received. You will be notified as soon as your place is confirmed.
      </p>
      {canViewExternalPaymentLinks && (
        <p className="mt-2 font-sans text-xs text-muted-foreground">
          Please check your email, including spam, for details.
        </p>
      )}
      {i.general_note && <p className="mt-2 font-sans text-xs italic text-muted-foreground">{i.general_note}</p>}
    </div>
  );
}
