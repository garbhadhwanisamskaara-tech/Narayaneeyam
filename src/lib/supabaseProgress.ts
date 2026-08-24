/**
 * Supabase-backed progress helpers.
 * Falls back to localStorage when not authenticated.
 */
import { getProgress, saveProgress, type UserProgress } from "./progress";

// ─── Streak ──────────────────────────────────────────────────────────────────

export async function updateStreakSupabase(): Promise<UserProgress> {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const current = getProgress();
  if (current.lastSessionDate === today) return current;

  let newStreak = 1;
  if (current.lastSessionDate === yesterday) {
    newStreak = current.currentStreak + 1;
  }

  const updated = saveProgress({
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, current.longestStreak),
    lastSessionDate: today,
    totalSessions: current.totalSessions + 1,
  });

  return updated;
}

// ─── Listening time ───────────────────────────────────────────────────────────

/**
 * Listening time is tracked locally. The previous Supabase write targeted a
 * table that does not exist, so it has been removed.
 */
export async function recordListeningTimeSupabase(_seconds: number) {
  // No-op: local storage already holds the time.
}
