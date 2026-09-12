/**
 * Supabase-backed progress helpers.
 * Falls back to localStorage when not authenticated.
 */
import { getProgress, saveProgress, type UserProgress } from "./progress";

// ─── Last session date ───────────────────────────────────────────────────────

export async function updateStreakSupabase(): Promise<UserProgress> {
  const today = new Date().toISOString().split("T")[0];

  const current = getProgress();
  if (current.lastSessionDate === today) return current;

  return saveProgress({ lastSessionDate: today });
}
