/**
 * Supabase-backed progress helpers.
 * Falls back to localStorage when not authenticated.
 */
import { supabase } from "@/integrations/supabase/client";
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

  // Persist to Supabase if signed in
  if (!supabase) return updated;
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await (supabase as any).from("chant_sessions").insert({
      user_id: user.id,
      dashakam_id: updated.lastDashakam,
      mode: "chant",
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    });
  }

  return updated;
}

// ─── Verse completion ─────────────────────────────────────────────────────────

export async function markVerseCompleted(verseId: string, mode: "chant" | "learn" | "script" = "chant") {
  if (!supabase) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase as any).from("user_progress").upsert(
    {
      user_id: user.id,
      verse_id: verseId,
      mode,
      completed: true,
      last_practiced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,verse_id,mode", ignoreDuplicates: false }
  );
}
