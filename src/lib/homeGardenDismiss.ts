import { istToday } from "@/lib/todaysDashakamDismiss";

/**
 * "Hide for today" for the home garden cards, one parayanam at a time.
 *
 * Stored on this device only, keyed by the Asia/Kolkata date, so every hidden
 * garden comes back by itself the next day. Nothing is written to the server.
 */
const KEY = "home_garden_hidden";

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { day?: string; ids?: string[] };
    return parsed?.day === istToday() && Array.isArray(parsed.ids) ? parsed.ids : [];
  } catch {
    return [];
  }
}

/** Parayanam ids whose home garden this device hid today. */
export function hiddenHomeGardensToday(): string[] {
  return read();
}

/** Hide one parayanam's home garden until the Kolkata day changes. */
export function hideHomeGardenToday(sessionId: string): void {
  try {
    const ids = Array.from(new Set([...read(), sessionId]));
    localStorage.setItem(KEY, JSON.stringify({ day: istToday(), ids }));
  } catch {
    /* storage unavailable (private mode): the garden simply stays visible */
  }
}
