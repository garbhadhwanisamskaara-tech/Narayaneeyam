/**
 * Festival Dashakam types and helpers.
 * Data is stored in Supabase `festival_dashakams` table when available,
 * otherwise falls back to localStorage for offline/demo use.
 */

import { supabase } from "@/integrations/supabase/client";

export interface FestivalDashakam {
  id: string;
  festival_name: string;
  festival_date: string; // YYYY-MM-DD
  dashakam_list: number[];
  custom_message: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const LS_KEY = "festival_dashakams";

// ─── Local storage fallback ──────────────────────────────────────────────────

function getLocalFestivals(): FestivalDashakam[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocalFestivals(festivals: FestivalDashakam[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(festivals));
}

// ─── CRUD operations ─────────────────────────────────────────────────────────

export async function getAllFestivals(): Promise<FestivalDashakam[]> {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("festival_dashakams")
        .select("*")
        .order("festival_date", { ascending: true });
      if (data && data.length > 0) return data as FestivalDashakam[];
    } catch {
      // fallback to local
    }
  }
  return getLocalFestivals();
}

export async function saveFestival(
  festival: Omit<FestivalDashakam, "id" | "created_at" | "updated_at">
): Promise<FestivalDashakam | null> {
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await (supabase as any)
          .from("festival_dashakams")
          .insert({ ...festival, created_by: user.id })
          .select()
          .single();
        return data as FestivalDashakam | null;
      }
    } catch {
      // fallback
    }
  }
  // Local fallback
  const newFestival: FestivalDashakam = {
    ...festival,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const all = getLocalFestivals();
  all.push(newFestival);
  saveLocalFestivals(all);
  return newFestival;
}

export async function updateFestival(
  id: string,
  updates: Partial<FestivalDashakam>
): Promise<void> {
  if (supabase) {
    try {
      await (supabase as any)
        .from("festival_dashakams")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      return;
    } catch {
      // fallback
    }
  }
  const all = getLocalFestivals();
  const idx = all.findIndex((f) => f.id === id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...updates };
    saveLocalFestivals(all);
  }
}

export async function deleteFestival(id: string): Promise<void> {
  if (supabase) {
    try {
      await supabase.from("festival_dashakams").delete().eq("id", id);
      return;
    } catch {
      // fallback
    }
  }
  const all = getLocalFestivals().filter((f) => f.id !== id);
  saveLocalFestivals(all);
}

// ─── Today's festival check ─────────────────────────────────────────────────

export async function getTodaysFestival(): Promise<FestivalDashakam | null> {
  const today = new Date().toISOString().split("T")[0];
  const all = await getAllFestivals();
  return all.find((f) => f.festival_date === today && f.is_active) ?? null;
}

// ─── Dismissed state (per-day, per-session) ──────────────────────────────────

const DISMISSED_KEY = "festival_dismissed";

export function isFestivalDismissedToday(): boolean {
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (!dismissed) return false;
  const today = new Date().toISOString().split("T")[0];
  return dismissed === today;
}

export function dismissFestivalToday(): void {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(DISMISSED_KEY, today);
}
