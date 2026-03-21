import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getFestivalCalendar,
  FESTIVAL_PATHWAYS,
  type FestivalCalendarEntry,
} from "@/data/devotionPathways";
import type { FestivalDashakam } from "@/lib/festivalDashakam";

export interface FestivalItem {
  id: string;
  festival_name: string;
  festival_date: string;
  dashakams: number[];
  custom_message: string;
  is_active: boolean;
  /** Days until festival (0 = today, negative = past) */
  daysUntil: number;
}

function toFestivalItem(f: FestivalDashakam): FestivalItem {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fDate = new Date(f.festival_date + "T00:00:00");
  const daysUntil = Math.round((fDate.getTime() - today.getTime()) / 86400000);
  return {
    id: f.id,
    festival_name: f.festival_name,
    festival_date: f.festival_date,
    dashakams: f.dashakam_list,
    custom_message: f.custom_message || "",
    is_active: f.is_active,
    daysUntil,
  };
}

function calendarToFestivalItem(entry: FestivalCalendarEntry, idx: number): FestivalItem {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fDate = new Date(entry.festival_date + "T00:00:00");
  const daysUntil = Math.round((fDate.getTime() - today.getTime()) / 86400000);
  return {
    id: `static-${idx}`,
    festival_name: entry.festival_name,
    festival_date: entry.festival_date,
    dashakams: entry.dashakams,
    custom_message: entry.description,
    is_active: true,
    daysUntil,
  };
}

interface UseFestivalPathwaysReturn {
  todayFestival: FestivalItem | null;
  upcomingFestivals: FestivalItem[];
  allFestivals: FestivalItem[];
  loading: boolean;
}

export function useFestivalPathways(): UseFestivalPathwaysReturn {
  const [allFestivals, setAllFestivals] = useState<FestivalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFestivals() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("festival_dashakams")
          .select("*")
          .eq("is_active", true)
          .order("festival_date", { ascending: true });

        if (!error && data && data.length > 0) {
          setAllFestivals((data as FestivalDashakam[]).map(toFestivalItem));
        } else {
          // Fall back to static calendar
          const calendar = getFestivalCalendar();
          setAllFestivals(calendar.map(calendarToFestivalItem));
        }
      } catch {
        const calendar = getFestivalCalendar();
        setAllFestivals(calendar.map(calendarToFestivalItem));
      } finally {
        setLoading(false);
      }
    }

    fetchFestivals();
  }, []);

  const todayFestival = allFestivals.find((f) => f.daysUntil === 0) ?? null;
  const upcomingFestivals = allFestivals
    .filter((f) => f.daysUntil > 0 && f.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    todayFestival,
    upcomingFestivals,
    allFestivals,
    loading,
  };
}
