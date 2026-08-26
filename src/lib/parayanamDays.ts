/**
 * The actual days a parayanam is conducted.
 *
 * A parayanam is not necessarily read on every calendar day between its start
 * and end date — the guru may choose, say, every Thursday and Saturday. These
 * derived dates are the single source of truth for the schedule preview, the
 * dashakam allocation and the live sessions.
 */

export type SchedulePattern = "DAILY" | "WEEKDAYS";

/** 0 = Sunday … 6 = Saturday, matching Date#getDay(). */
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Chip order starts on Monday, the way people read a week. */
export const WEEKDAY_CHIP_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const MAX_DAYS = 1000;

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  if (!start || !end || end < start) return out;
  const d = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  let guard = 0;
  while (d <= last && guard++ < MAX_DAYS) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** The dates the parayanam is actually conducted on, in chronological order. */
export function parayanamDates(
  start: string,
  end: string,
  pattern: SchedulePattern | null | undefined,
  weekdays: number[] | null | undefined
): string[] {
  const all = eachDate(start, end);
  if (pattern !== "WEEKDAYS") return all;
  const wanted = new Set(weekdays ?? []);
  if (!wanted.size) return [];
  return all.filter((d) => wanted.has(new Date(`${d}T00:00:00`).getDay()));
}

/** "Thu 3 Sep" */
export function shortDate(d: string) {
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "Day 1 · Thu 3 Sep" */
export function dayLine(index: number, date: string) {
  return `Day ${index + 1} · ${shortDate(date)}`;
}

/** "Every Thursday & Saturday" / "Every day" */
export function patternLabel(
  pattern: SchedulePattern | null | undefined,
  weekdays: number[] | null | undefined
) {
  if (pattern !== "WEEKDAYS") return "Every day";
  const picked = WEEKDAY_CHIP_ORDER.filter((d) => (weekdays ?? []).includes(d));
  if (!picked.length) return "No days chosen yet";
  const names = picked.map((d) => FULL_WEEKDAYS[d]);
  if (names.length === 1) return `Every ${names[0]}`;
  return `Every ${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

const FULL_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** "8 parayanam days" */
export function dayCountLabel(count: number) {
  return `${count} ${count === 1 ? "parayanam day" : "parayanam days"}`;
}
