import { Check, Clock, ExternalLink, HandCoins, Loader2, Users, X } from "lucide-react";
import type { PendingInvite } from "@/hooks/useParayanamParticipants";
import { useCapabilities } from "@/hooks/useCapabilities";

const fmt = (d: string | null) => {
  if (!d) return null;
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};
const isPaymentLink = (value: string | null | undefined) => !!value && /^https?:\/\//i.test(value.trim());

interface Props {
  invite: PendingInvite;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
  /** When provided, a PAID invite shows "Pay ₹… to Join" instead of Accept. */
  onPay?: () => void;
}

/**
 * The member-facing invitation card for one parayanam. The meeting link is never
 * shown here — even for Live parayanams — it only appears once access is active.
 */
export default function ParayanamInviteCard({ invite: i, busy, onAccept, onDecline, onPay }: Props) {
  // Once the Guru has confirmed the contribution, the participant is never
  // asked to pay again for this parayanam — Accept/Decline stay available.
  const contributionSettled = i.contribution_status === "confirmed" || i.contribution_status === "not_required";
  const paid = i.participation_type === "PAID" && !contributionSettled;
  const live = i.delivery_mode === "LIVE";
  const { canViewExternalPaymentLinks } = useCapabilities();
  const canPayInApp = paid && !!onPay;

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
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
        {paid && canViewExternalPaymentLinks && (
          <>
            <div>
              <span className="text-foreground/80">Contribution:</span>{" "}
              {i.contribution_amount != null ? `₹${i.contribution_amount}` : "As advised by the Guru"}
            </div>
            {!canPayInApp && !paymentsPaused && i.payment_url && (
              <div>
                {isPaymentLink(i.payment_url) ? (
                  <a
                    href={i.payment_url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                  >
                    <HandCoins className="h-3.5 w-3.5" /> Make Payment
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap font-sans text-xs text-foreground/80">{i.payment_url}</p>
                )}
              </div>
            )}
            {!canPayInApp && (
              <p className="font-sans text-[11px] leading-snug text-muted-foreground">
                This contribution goes directly to the Guru — narayaneeyam.app does not process, verify, or hold this
                payment.
              </p>
            )}
            {i.payment_note && <div className="italic">{i.payment_note}</div>}
          </>
        )}
        {i.general_note && <div className="italic">{i.general_note}</div>}
      </dl>

      <div className="mt-4 flex gap-2">
        {canPayInApp ? (
          <button
            onClick={onPay}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HandCoins className="h-3.5 w-3.5" />}
            {i.contribution_amount != null ? `Pay ₹${i.contribution_amount} to Join` : "Pay to Join"}
          </button>
        ) : paymentsPaused ? (
          <p className="rounded-lg bg-primary/10 px-3 py-2 font-sans text-xs font-semibold text-primary">
            Payments are temporarily paused for system maintenance. Please check back after 3rd September.
          </p>
        ) : (
          <button
            onClick={onAccept}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Accept Invitation
          </button>
        )}
        <button
          onClick={onDecline}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 font-sans text-xs font-semibold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-60"
        >
          <X className="h-3.5 w-3.5" /> Decline
        </button>
      </div>
    </div>
  );
}

/** Shown after a member accepts a contribution-based parayanam. */
export function AwaitingContributionCard({ invite: i }: { invite: PendingInvite }) {
  const { canViewExternalPaymentLinks } = useCapabilities();
  const contributionSettled = i.contribution_status === "confirmed" || i.contribution_status === "not_required";

  if (contributionSettled) return null;

  if (!canViewExternalPaymentLinks) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
        <p className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <Clock className="h-4 w-4 text-primary" /> Awaiting Guru approval
        </p>
        <p className="mt-1 font-sans text-xs text-muted-foreground">
          Your participation in {i.parayanam_name ?? "this parayanam"} is awaiting approval from the Guru.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <Clock className="h-4 w-4 text-primary" /> Awaiting Guru approval
      </p>
      <p className="mt-1 font-sans text-xs text-muted-foreground">
        You have accepted the invitation to {i.parayanam_name ?? "this parayanam"}. Your access opens once
        {i.guru_name ? ` ${i.guru_name}` : " your Guru"} approves your contribution.
      </p>
      {i.contribution_amount != null && (
        <p className="mt-2 font-sans text-xs text-foreground/80">Contribution: ₹{i.contribution_amount}</p>
      )}
      {i.payment_url &&
        (isPaymentLink(i.payment_url) ? (
          <a
            href={i.payment_url.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-sans text-xs text-primary underline underline-offset-2"
          >
            <HandCoins className="h-3.5 w-3.5" /> Make Payment
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="mt-2 whitespace-pre-wrap font-sans text-xs text-foreground/80">{i.payment_url}</p>
        ))}
      <p className="mt-2 font-sans text-[11px] leading-snug text-muted-foreground">
        This contribution goes directly to the Guru — narayaneeyam.app does not process, verify, or hold this payment.
      </p>
      {i.payment_note && <p className="mt-2 font-sans text-xs italic text-muted-foreground">{i.payment_note}</p>}
      {i.general_note && <p className="mt-2 font-sans text-xs italic text-muted-foreground">{i.general_note}</p>}
    </div>
  );
}
