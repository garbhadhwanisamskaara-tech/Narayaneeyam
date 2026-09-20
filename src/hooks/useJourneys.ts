import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Journey {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  description: string | null;
  cover_image: string | null;
  journey_type: string;
  duration_days: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  progress_visual_type: "LOTUS_CONCENTRIC_RINGS" | "LOTUS_GARDEN" | "FEATHER" | "SIMPLE_PROGRESS";
  created_at: string;
  updated_at: string;
}

interface UseJourneysResult {
  journeys: Journey[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Lists all PUBLISHED journeys for the /journeys landing page, newest first.
 * RLS already restricts non-admins to PUBLISHED rows (§12), so no extra
 * client-side filtering is needed beyond the explicit .eq for clarity.
 */
export function useJourneys(): UseJourneysResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["journeys"],
    queryFn: async (): Promise<Journey[]> => {
      const { data, error } = await (supabase as any)
        .from("journeys")
        .select("*")
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Journey[];
    },
  });

  return {
    journeys: data ?? [],
    isLoading,
    error: (error as Error | null) ?? null,
  };
}
