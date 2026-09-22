/**
 * current_day = 0 before effective_start_date, otherwise
 * min((today - effective_start_date) + 1, duration_days)
 * per §14. Computed client-side from effective_start_date -- never trusted
 * as a stored value, so it can never drift out of sync with the unlocking
 * rule even if duration_days changes after enrollment (§18).
 *
 * effectiveStartDate is a plain "YYYY-MM-DD" date string (journey_enrollments
 * .effective_start_date). "Today" is taken in the same terms -- calendar
 * date, no time-of-day component -- so a user opening the app at 11pm or
 * 1am on the same calendar day gets the same current_day.
 */
export function getJourneyDayPosition(effectiveStartDate: string, todayDate?: string): number {
  const start = new Date(effectiveStartDate + "T00:00:00");
  const today = new Date((todayDate ?? new Date().toISOString().split("T")[0]) + "T00:00:00");

  const diffDays = Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

export function getCurrentDay(effectiveStartDate: string, durationDays: number, todayDate?: string): number {
  const day = getJourneyDayPosition(effectiveStartDate, todayDate);

  if (day < 1) return 0;
  return Math.min(day, durationDays);
}
