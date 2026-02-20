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
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("chant_sessions").insert({
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("user_progress").upsert(
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

// ─── Lesson plan helpers ──────────────────────────────────────────────────────

export interface SupabaseLessonPlan {
  id: string;
  name: string;
  frequency: string;
  minutes_per_session: number;
  start_dashakam: number;
  end_dashakam: number;
  schedule_json: unknown;
  created_at: string;
  updated_at: string;
}

export async function getLessonPlansFromDB(): Promise<SupabaseLessonPlan[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("lesson_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function saveLessonPlanToDB(plan: Omit<SupabaseLessonPlan, "id" | "created_at" | "updated_at">) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("lesson_plans")
    .insert({ ...plan, user_id: user.id })
    .select()
    .single();
  return data;
}

export async function deleteLessonPlanFromDB(id: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("lesson_plans").delete().eq("id", id).eq("user_id", user.id);
}

/** Mark a lesson as completed and advance the pointer in schedule_json */
export async function completeLessonAndAdvance(planId: string, lessonIndex: number) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: plan } = await supabase
    .from("lesson_plans")
    .select("schedule_json")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (!plan) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schedule = plan.schedule_json as any[];
  if (!Array.isArray(schedule)) return null;

  if (lessonIndex < schedule.length) {
    schedule[lessonIndex] = {
      ...schedule[lessonIndex],
      completed: true,
      completedAt: new Date().toISOString(),
    };
  }

  // Auto-advance: find next incomplete lesson index
  const nextIndex = schedule.findIndex(
    (l: { completed?: boolean }, i: number) => i > lessonIndex && !l.completed
  );

  const { data: updated } = await supabase
    .from("lesson_plans")
    .update({
      schedule_json: schedule,
      updated_at: new Date().toISOString(),
    })
    .eq("id", planId)
    .eq("user_id", user.id)
    .select()
    .single();

  return { updated, nextLessonIndex: nextIndex };
}
