import { Check, X } from "lucide-react";

type Row = { label: string; value: string; ok?: boolean };

const prettyDate = (d: string) =>
  d
    ? new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

export type ParayanamReviewProps = {
  parayanamName: string;
  groupName?: string | null;
  startDate: string;
  endDate: string;
  isSingleDay: boolean;
  /** e.g. "Every Thursday & Saturday" */
  scheduleLabel: string;
  dayCount: number;
  distributionLabel?: string;
  deliveryMode: "SELF_PACED" | "LIVE";
  live?: {
    planLabel: string;
    startTime: string;
    endTime: string;
    sessionCount: number;
    hasMeetingLink: boolean;
    joinBeforeMins: number;
  };
  contribution?: {
    amount: string;
    hasPaymentLink: boolean;
  } | null;
  invitedCount: number;
  isGroup: boolean;
};

export default function ParayanamReview(props: ParayanamReviewProps) {
  const { live, contribution } = props;

  const rows: Row[] = [
    { label: "Parayanam name", value: props.parayanamName.trim() || "Untitled parayanam" },
    ...(props.isGroup ? [{ label: "Group", value: props.groupName || "Your group" }] : []),
    props.isSingleDay
      ? { label: "Date", value: prettyDate(props.startDate) }
      : { label: "Dates", value: `${prettyDate(props.startDate)} to ${prettyDate(props.endDate)}` },
    { label: "Parayanam days", value: `${props.scheduleLabel} · ${props.dayCount} in all` },
    ...(props.distributionLabel ? [{ label: "How dashakams are shared", value: props.distributionLabel }] : []),
    { label: "How it is conducted", value: props.deliveryMode === "LIVE" ? "Live" : "Self-paced" },
  ];

  if (live) {
    rows.push(
      { label: "Sessions", value: `${live.planLabel} · ${live.sessionCount} in total` },
      { label: "Session timing", value: `${live.startTime} to ${live.endTime} IST` },
      {
        label: "Meeting link",
        value: live.hasMeetingLink ? "Meeting link added" : "Meeting link missing",
        ok: live.hasMeetingLink,
      },
      { label: "Join button appears", value: `${live.joinBeforeMins} minutes before each session` },
    );
  }

  rows.push(
    contribution
      ? { label: "Contribution", value: `${contribution.amount} to join` }
      : { label: "Contribution", value: "Free to join" },
  );
  if (contribution) {
    rows.push({
      label: "Payment / contribution details",
      value: contribution.hasPaymentLink ? "Payment details added" : "Payment details missing",
      ok: contribution.hasPaymentLink,
    });
  }
  if (props.isGroup) {
    rows.push({
      label: "Members invited",
      value: `${props.invitedCount} ${props.invitedCount === 1 ? "member" : "members"}`,
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="font-sans text-base font-semibold text-foreground">Please check everything</p>
        <p className="mt-1 font-sans text-sm text-muted-foreground">
          Go back and change anything you wish before you create this parayanam.
        </p>
      </div>
      <dl className="divide-y divide-border rounded-2xl border-2 border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-wrap items-center justify-between gap-2 px-4 py-4">
            <dt className="font-sans text-sm text-muted-foreground">{r.label}</dt>
            <dd className="flex items-center gap-2 font-sans text-base font-semibold text-foreground">
              {r.ok === true && <Check className="h-5 w-5 text-primary" />}
              {r.ok === false && <X className="h-5 w-5 text-destructive" />}
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
