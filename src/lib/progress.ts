// Progress tracking using localStorage (will move to DB with Cloud)

export interface BookmarkEntry {
  verseId: string;
  dashakam: number;
  verse: number;
  mode: "chant" | "learn" | "podcast" | "script" | "dashboard";
  savedAt: string;
}

export interface FavouriteEntry {
  verseId: string;
  dashakam: number;
  verse: number;
  sanskrit: string;
  savedAt: string;
}

export interface UserProgress {
  lastDashakam: number;
  lastParagraph: number;
  lastPage: string;
  completedVerses: string[]; // verse ids
  completedDashakams: number[];
  totalChantingMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string;
  totalSessions: number;
  bookmarks: string[];
  bookmarkEntries: BookmarkEntry[];
  favouriteEntries: FavouriteEntry[];
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
  totalChantingMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastSessionDate: "",
  totalSessions: 0,
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

export function updateStreak() {
  const progress = getProgress();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (progress.lastSessionDate === today) return progress;

  let newStreak = 1;
  if (progress.lastSessionDate === yesterday) {
    newStreak = progress.currentStreak + 1;
  }

  return saveProgress({
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, progress.longestStreak),
    lastSessionDate: today,
    totalSessions: progress.totalSessions + 1,
  });
}
