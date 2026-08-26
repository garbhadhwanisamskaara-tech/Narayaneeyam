import { CalendarClock, Clock } from "lucide-react";

export type DeliveryMode = "SELF_PACED" | "LIVE";

const OPTIONS: { value: DeliveryMode; label: string; hint: string; Icon: typeof Clock }[] = [
  {
    value: "SELF_PACED",
    label: "Self-paced",
    hint: "Members chant at their own time.",
    Icon: Clock,
  },
  {
    value: "LIVE",
    label: "Live",
    hint: "Members can join scheduled online sessions.",
    Icon: CalendarClock,
  },
];

export default function ParayanamModeSelector({
  value,
  onChange,
}: {
  value: DeliveryMode;
  onChange: (v: DeliveryMode) => void;
}) {
  return (
    <div>
      <p className="font-sans text-base font-semibold text-foreground">
        How will you conduct this Parayanam?
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map(({ value: v, label, hint, Icon }) => {
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
