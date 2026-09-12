/**
 * Static Devotion Pathways data with Supabase integration.
 * Saves to user_progress table when logged in, localStorage fallback for guests.
 */

import { supabase } from "@/integrations/supabase/client";

export interface DevotionPathway {
  id: string;
  name: string;
  description: string;
  icon: string;
  dashakams: number[];
  display_order: number;
  active: boolean;
  type: "standard" | "festival";
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
  festival_date: string;
  year: number;
  description: string;
  dashakams: number[];
}

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
  return FESTIVAL_CALENDAR_2026;
}

export function getTodayFestival(): FestivalCalendarEntry | null {
  const today = new Date().toISOString().split("T")[0];
  const calendar = getFestivalCalendar();
  return calendar.find((f) => f.festival_date === today) ?? null;
}

