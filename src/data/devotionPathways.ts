/**
 * Static Devotion Pathways data (UI-first, no DB yet).
 * When Lovable Cloud is enabled, this will be replaced by DB queries.
 */

export interface DevotionPathway {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  dashakams: number[];
  display_order: number;
  active: boolean;
  type: "standard" | "festival" | "journey";
}

export interface FestivalPathway {
  id: string;
  festival_name: string;
  dashakams: number[];
}

// ─── Mini Narayaneeyam ───────────────────────────────────────────────────────
export const MINI_NARAYANEEYAM: number[] = [
  1, 5, 10, 12, 24, 25, 30, 34, 37, 38, 46, 50, 78, 87, 100,
];

// ─── Super Mini Narayaneeyam ─────────────────────────────────────────────────
export const SUPER_MINI_NARAYANEEYAM: number[] = [1, 24, 37, 87, 100];

// ─── Festival → Dashakam mappings ────────────────────────────────────────────
export const FESTIVAL_PATHWAYS: FestivalPathway[] = [
  { id: "krishna-janmashtami", festival_name: "Krishna Janmashtami", dashakams: [37, 38, 46] },
  { id: "narasimha-jayanti", festival_name: "Narasimha Jayanti", dashakams: [24, 25] },
  { id: "rama-navami", festival_name: "Rama Navami", dashakams: [34] },
  { id: "ekadasi", festival_name: "Ekadasi", dashakams: [8, 98] },
  { id: "vaikunta-ekadasi", festival_name: "Vaikunta Ekadasi", dashakams: [8, 90, 98, 100] },
  { id: "narayaneeyam-day", festival_name: "Narayaneeyam Day", dashakams: [1, 100] },
  { id: "deepavali", festival_name: "Deepavali", dashakams: [81] },
  { id: "guruvayur-ekadasi", festival_name: "Guruvayur Ekadasi", dashakams: [1, 87, 100] },
];

// ─── Festival Calendar (known dates for 2025-2026) ───────────────────────────
export interface FestivalCalendarEntry {
  festival_name: string;
  festival_date: string; // YYYY-MM-DD
  year: number;
  description: string;
  dashakams: number[];
}

// Approximate dates — admin can override via DB later
export const FESTIVAL_CALENDAR_2025: FestivalCalendarEntry[] = [
  { festival_name: "Vaikunta Ekadasi", festival_date: "2025-01-06", year: 2025, description: "The most auspicious Ekadasi", dashakams: [8, 90, 98, 100] },
  { festival_name: "Narayaneeyam Day", festival_date: "2025-11-28", year: 2025, description: "Anniversary of Narayaneeyam composition", dashakams: [1, 100] },
  { festival_name: "Rama Navami", festival_date: "2025-04-06", year: 2025, description: "Birth of Lord Rama", dashakams: [34] },
  { festival_name: "Narasimha Jayanti", festival_date: "2025-05-11", year: 2025, description: "Appearance of Lord Narasimha", dashakams: [24, 25] },
  { festival_name: "Krishna Janmashtami", festival_date: "2025-08-16", year: 2025, description: "Birth of Lord Krishna", dashakams: [37, 38, 46] },
  { festival_name: "Deepavali", festival_date: "2025-10-20", year: 2025, description: "Festival of Lights — Narakasura Vadham", dashakams: [81] },
  { festival_name: "Guruvayur Ekadasi", festival_date: "2025-12-01", year: 2025, description: "Special Ekadasi at Guruvayur", dashakams: [1, 87, 100] },
];

export const FESTIVAL_CALENDAR_2026: FestivalCalendarEntry[] = [
  { festival_name: "Vaikunta Ekadasi", festival_date: "2026-01-25", year: 2026, description: "The most auspicious Ekadasi", dashakams: [8, 90, 98, 100] },
  { festival_name: "Rama Navami", festival_date: "2026-03-26", year: 2026, description: "Birth of Lord Rama", dashakams: [34] },
  { festival_name: "Narasimha Jayanti", festival_date: "2026-05-01", year: 2026, description: "Appearance of Lord Narasimha", dashakams: [24, 25] },
  { festival_name: "Krishna Janmashtami", festival_date: "2026-08-05", year: 2026, description: "Birth of Lord Krishna", dashakams: [37, 38, 46] },
  { festival_name: "Deepavali", festival_date: "2026-11-08", year: 2026, description: "Festival of Lights — Narakasura Vadham", dashakams: [81] },
  { festival_name: "Narayaneeyam Day", festival_date: "2026-11-28", year: 2026, description: "Anniversary of Narayaneeyam composition", dashakams: [1, 100] },
  { festival_name: "Guruvayur Ekadasi", festival_date: "2026-12-20", year: 2026, description: "Special Ekadasi at Guruvayur", dashakams: [1, 87, 100] },
];

export function getFestivalCalendar(): FestivalCalendarEntry[] {
  const currentYear = new Date().getFullYear();
  if (currentYear === 2025) return FESTIVAL_CALENDAR_2025;
  if (currentYear === 2026) return FESTIVAL_CALENDAR_2026;
  // Fallback: return 2026 data adjusted (admin should configure for future years)
  return FESTIVAL_CALENDAR_2026;
}

export function getTodayFestival(): FestivalCalendarEntry | null {
  const today = new Date().toISOString().split("T")[0];
  const calendar = getFestivalCalendar();
  return calendar.find((f) => f.festival_date === today) ?? null;
}

// ─── All pathways for the card grid ──────────────────────────────────────────
export const DEVOTION_PATHWAYS: DevotionPathway[] = [
  {
    id: "full-narayaneeyam",
    name: "Full Narayaneeyam",
    description: "Chant all 100 Dashakams",
    icon: "BookOpen",
    dashakams: Array.from({ length: 100 }, (_, i) => i + 1),
    display_order: 1,
    active: true,
    type: "standard",
  },
  {
    id: "festival-pathways",
    name: "Festival Pathways",
    description: "Dashakams recommended for important festivals",
    icon: "Sparkles",
    dashakams: [],
    display_order: 2,
    active: true,
    type: "festival",
  },
  {
    id: "mini-narayaneeyam",
    name: "Mini Narayaneeyam",
    description: "Condensed set of important Dashakams",
    icon: "Star",
    dashakams: MINI_NARAYANEEYAM,
    display_order: 3,
    active: true,
    type: "standard",
  },
  {
    id: "100-day-journey",
    name: "100 Day Journey",
    description: "One Dashakam per day for 100 days",
    icon: "Calendar",
    dashakams: Array.from({ length: 100 }, (_, i) => i + 1),
    display_order: 4,
    active: true,
    type: "journey",
  },
  {
    id: "super-mini-narayaneeyam",
    name: "Super Mini Narayaneeyam",
    description: "Short daily devotion — 5 key Dashakams",
    icon: "Zap",
    dashakams: SUPER_MINI_NARAYANEEYAM,
    display_order: 5,
    active: true,
    type: "standard",
  },
];

// ─── 100-Day Journey progress (localStorage for now) ─────────────────────────
const JOURNEY_KEY = "100day_journey";

export interface JourneyProgress {
  pathway_id: string;
  started_at: string;
  completions: { dashakam: number; date: string }[];
}

export function getJourneyProgress(): JourneyProgress | null {
  try {
    const raw = localStorage.getItem(JOURNEY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveJourneyProgress(progress: JourneyProgress): void {
  localStorage.setItem(JOURNEY_KEY, JSON.stringify(progress));
}

export function startJourney(): JourneyProgress {
  const progress: JourneyProgress = {
    pathway_id: "100-day-journey",
    started_at: new Date().toISOString(),
    completions: [],
  };
  saveJourneyProgress(progress);
  return progress;
}

export function markDayComplete(dashakam: number): JourneyProgress {
  let progress = getJourneyProgress();
  if (!progress) progress = startJourney();
  const today = new Date().toISOString().split("T")[0];
  if (!progress.completions.find((c) => c.dashakam === dashakam)) {
    progress.completions.push({ dashakam, date: today });
    saveJourneyProgress(progress);
  }
  return progress;
}

export function shouldShowJourneyOnDashboard(): boolean {
  const progress = getJourneyProgress();
  if (!progress || progress.completions.length === 0) return false;
  const lastCompletion = progress.completions[progress.completions.length - 1];
  const lastDate = new Date(lastCompletion.date);
  const now = new Date();
  const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
  // Show for 7 days after last completion
  return daysSince <= 7;
}
