import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RitualChant {
  chant_key: string;
  trigger_point: string;
  display_order: number;
  chant_audio_file: string | null;
  learn_audio_file: string | null;
  transliteration_text: string;
  translation_text: string;
}

interface UseRitualChantsReturn {
  openingChants: RitualChant[];
  dashakamClosingChant: RitualChant | null;
  sessionClosingChant: RitualChant | null;
  loading: boolean;
}

export function useRitualChants(languageCode: string = "en"): UseRitualChantsReturn {
  const [chants, setChants] = useState<RitualChant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("ritual_chants")
          .select(`
            chant_key, trigger_point, display_order,
            chant_audio_file, learn_audio_file,
            ritual_chant_scripts!left (language_code, transliteration_text, translation_text)
          `)
          .order("trigger_point")
          .order("display_order");

        if (!error && data) {
          const mapped: RitualChant[] = data.map((r: any) => {
            const script = Array.isArray(r.ritual_chant_scripts)
              ? r.ritual_chant_scripts.find((s: any) => s.language_code === languageCode)
              : null;
            return {
              chant_key: r.chant_key,
              trigger_point: r.trigger_point,
              display_order: r.display_order,
              chant_audio_file: r.chant_audio_file,
              learn_audio_file: r.learn_audio_file,
              transliteration_text: script?.transliteration_text || "",
              translation_text: script?.translation_text || "",
            };
          });
          setChants(mapped);
        }
      } catch {
        // silently skip
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [languageCode]);

  const openingChants = chants
    .filter((c) => c.trigger_point === "session_start")
    .sort((a, b) => a.display_order - b.display_order);

  const dashakamClosingChant = chants.find((c) => c.trigger_point === "dashakam_end") ?? null;
  const sessionClosingChant = chants.find((c) => c.trigger_point === "session_end") ?? null;

  return { openingChants, dashakamClosingChant, sessionClosingChant, loading };
}
