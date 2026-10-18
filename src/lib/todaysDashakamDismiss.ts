/**
 * "Hide for today" for the home hero's Today's Dashakam card.
 *
 * Stored on this device only, keyed by the parayanam day (YYYY-MM-DD in
 * Asia/Kolkata), so the card comes back by itself once the day turns. Nothing
 * is written to the schedule, the queue or the server — the dashakam stays
 * assigned and still appears in the queue list.
 */

const DISMISSED_KEY = "todays_dashakam_dismissed";

/** Today's date as YYYY-MM-DD in Asia/Kolkata — the day a parayanam counts by. */
export function istToday(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

/** True when this device hid the card earlier today. */
export function isTodaysDashakamDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === istToday();
  } catch {
    return false;
  }
}

/** Hide the card until the Kolkata day changes. */
export function dismissTodaysDashakam(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, istToday());
  } catch {
    /* storage unavailable (private mode) — the card simply stays visible */
  }
}
