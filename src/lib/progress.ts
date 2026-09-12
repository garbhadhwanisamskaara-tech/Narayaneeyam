// Progress tracking using localStorage (will move to DB with Cloud)

export interface BookmarkEntry {
  verseId: string;
  dashakam: number;
  verse: number;
  mode: "chant" | "learn" | "podcast" | "script" | "dashboard";
  savedAt: string;
  /** Metrical form (chandas) of the verse, when known. */
  meter?: string;
}

export interface FavouriteEntry {
  verseId: string;
  dashakam: number;
  verse: number;
  sanskrit: string;
  savedAt: string;
  /** Metrical form (chandas) of the verse, when known. */
  meter?: string;
  /** Language code the verse was saved in (e.g. "en", "sa"). Legacy entries default to "en". */
  language?: string;
}

export interface UserProgress {
  lastDashakam: number;
  lastParagraph: number;
  lastPage: string;
  completedVerses: string[]; // verse ids
  completedDashakams: number[];
  lastSessionDate: string;
  bookmarks: string[];
  bookmarkEntries: BookmarkEntry[];
  favouriteEntries: FavouriteEntry[];
  /** Set once local bookmarks have been uploaded to the signed-in account. */
  bookmarksSyncedAt?: string;
  /** Set once local favourites have been uploaded to the signed-in account. */
  favouritesSyncedAt?: string;
  preferredLanguage: string;
  chantSpeed: number;
  loopCount: number;
  // Per-page resume state
  chantState?: { dashakam: number; para: number | null; verse: number };
  learnState?: { planId: string; lessonIdx: number };
  podcastState?: { dashakam: number; verseIdx: number; playMode: string };
}

const STORAGE_KEY = "narayaneeyam_progress";

const defaultProgress: UserProgress = {
  lastDashakam: 1,
  lastParagraph: 1,
  lastPage: "/",
  completedVerses: [],
  completedDashakams: [],
  lastSessionDate: "",
  bookmarks: [],
  bookmarkEntries: [],
  favouriteEntries: [],
  preferredLanguage: "english",
  chantSpeed: 1,
  loopCount: 1,
};

export function getProgress(): UserProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...defaultProgress, ...JSON.parse(stored) };
  } catch {}
  return { ...defaultProgress };
}

export function saveProgress(progress: Partial<UserProgress>) {
  const current = getProgress();
  const updated = { ...current, ...progress };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Remove the locally-mirrored bookmark/favourite arrays.
 * Used once a signed-in user's entries live in Supabase, so the same rows are
 * never kept in two places. Safe to call repeatedly (no-op when already empty).
 */
export function clearLocalSavedEntries(which: "bookmarks" | "favourites"): void {
  const current = getProgress();
  if (which === "bookmarks") {
    if ((current.bookmarkEntries || []).length === 0) return;
    saveProgress({ bookmarkEntries: [] });
  } else {
    if ((current.favouriteEntries || []).length === 0) return;
    saveProgress({ favouriteEntries: [] });
  }
}

export function updateStreak() {
  const progress = getProgress();
  const today = new Date().toISOString().split("T")[0];

  if (progress.lastSessionDate === today) return progress;

  return saveProgress({ lastSessionDate: today });
}
