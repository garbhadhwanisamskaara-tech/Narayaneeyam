/**
 * current_day = clamp((today - effective_start_date) + 1, 1, duration_days)
 * per §14. Computed client-side from effective_start_date -- never trusted
 * as a stored value, so it can never drift out of sync with the unlocking
 * rule even if duration_days changes after enrollment (§18).
 *
 * effectiveStartDate is a plain "YYYY-MM-DD" date string (journey_enrollments
 * .effective_start_date). "Today" is taken in the same terms -- calendar
 * date, no time-of-day component -- so a user opening the app at 11pm or
 * 1am on the same calendar day gets the same current_day.
 */
export function getCurrentDay(effectiveStartDate: string, durationDays: number): number {
  const start = new Date(effectiveStartDate + "T00:00:00");
  const today = new Date(new Date().toISOString().split("T")[0] + "T00:00:00");

  const diffDays = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const day = diffDays + 1;

  return Math.min(Math.max(day, 1), durationDays);
}
