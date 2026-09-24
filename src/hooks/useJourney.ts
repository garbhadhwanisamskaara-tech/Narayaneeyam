import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Journey } from "./useJourneys";

export interface JourneyDay {
  id: string;
  journey_id: string;
  day_number: number;
  title: string;
  hook: string | null;
  explanation: string | null;
  task_instruction: string | null;
  reflection_text: string | null;
  cta_label: string | null;
  action_type: "NONE" | "OPEN_DASHAKAM" | "OPEN_VERSE" | "OPEN_MEANING" | "OPEN_AUDIO" | "OPEN_PRASADAM" | "OPEN_PAGE" | "EXTERNAL_LINK";
  action_payload: Record<string, unknown>;
  secondary_action_type?: "NONE" | "OPEN_DASHAKAM" | "OPEN_VERSE" | "OPEN_MEANING" | "OPEN_AUDIO" | "OPEN_PRASADAM" | "OPEN_PAGE" | "EXTERNAL_LINK";
  secondary_action_payload?: Record<string, unknown> | null;
  secondary_cta_label?: string | null;
  image_url: string | null;
  estimated_minutes: number | null;
  completion_method: "MANUAL" | "AUTOMATIC";
  whatsapp_message: string | null;
  is_active: boolean;
}

export interface JourneyRun {
  id: string;
  journey_id: string;
  display_name: string | null;
  availability_mode: "SELF_PACED" | "COHORT";
  start_date: string | null;
  end_date: string | null;
  status: string;
  visibility: "PUBLIC" | "INVITE_ONLY";
  whatsapp_link: string | null;
  is_default: boolean;
}

interface UseJourneyResult {
  journey: Journey | null;
  days: JourneyDay[];
  availableRuns: JourneyRun[];
  /** The run a plain "Join" tap uses -- the is_default row when there's only
   *  one (V1's case), else the first OPEN/ACTIVE row. No run-picker UI is
   *  built in V1 since only one run exists per journey (§13). */
  defaultRun: JourneyRun | null;
  isLoading: boolean;
  error: Error | null;
}

export function useJourney(slug: string | undefined): UseJourneyResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["journey", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data: journey, error: journeyErr } = await (supabase as any)
        .from("journeys")
        .select("*")
        .eq("slug", slug!)
        .single();

      if (journeyErr) throw journeyErr;

      const { data: days, error: daysErr } = await (supabase as any)
        .from("journey_days")
        .select("*")
        .eq("journey_id", journey.id)
        .eq("is_active", true)
        .order("day_number", { ascending: true });

      if (daysErr) throw daysErr;

      const { data: runs, error: runsErr } = await (supabase as any)
        .from("journey_runs")
        .select("*")
        .eq("journey_id", journey.id)
        .in("status", ["OPEN", "ACTIVE"])
        .order("is_default", { ascending: false });

      if (runsErr) throw runsErr;

      return {
        journey: journey as Journey,
        days: (days ?? []) as JourneyDay[],
        availableRuns: (runs ?? []) as JourneyRun[],
        defaultRun: ((runs ?? [])[0] ?? null) as JourneyRun | null,
      };
    },
  });

  return {
    journey: data?.journey ?? null,
    days: data?.days ?? [],
    availableRuns: data?.availableRuns ?? [],
    defaultRun: data?.defaultRun ?? null,
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
