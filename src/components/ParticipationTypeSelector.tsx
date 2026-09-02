import { HandHeart, Gift } from "lucide-react";

/** Stored as 'FREE' | 'PAID'. "PAID" is never shown to the user. */
export type ParticipationType = "FREE" | "PAID";

const OPTIONS: { value: ParticipationType; label: string; hint: string; Icon: typeof Gift }[] = [
  {
    value: "FREE",
    label: "Free",
    hint: "Anyone invited can join without contributing.",
    Icon: Gift,
  },
  {
    value: "PAID",
    label: "Contribution required",
    hint: "Members offer a contribution to take part.",
    Icon: HandHeart,
  },
];

export default function ParticipationTypeSelector({
  value,
  onChange,
  allowPaid = true,
}: {
  value: ParticipationType;
  onChange: (v: ParticipationType) => void;
  /** When false, the PAID option is hidden entirely (monetization not approved). */
  allowPaid?: boolean;
}) {
  const options = allowPaid ? OPTIONS : OPTIONS.filter((o) => o.value === "FREE");
  return (
    <div>
      <p className="font-sans text-base font-semibold text-foreground">
        Is there a contribution to join?
      </p>
      <div className={allowPaid ? "mt-3 grid gap-3 sm:grid-cols-2" : "mt-3"}>
        {options.map(({ value: v, label, hint, Icon }) => {
          const active = value === v;
          return (
            <button
              key={v}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(v)}
              className={`flex min-h-[104px] w-full items-start gap-3 rounded-2xl border-2 p-5 text-left transition-colors ${
                active
                  ? "border-primary bg-secondary/40"
                  : "border-border hover:border-primary"
              }`}
            >
              <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span>
                <span className="block font-sans text-lg font-bold text-foreground">{label}</span>
                <span className="mt-1 block font-sans text-sm text-muted-foreground">{hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
