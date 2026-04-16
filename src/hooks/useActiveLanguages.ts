import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TRANSLITERATION_LANGUAGES, type TransliterationLanguage } from "@/data/narayaneeyam";

interface LanguageOption {
  value: TransliterationLanguage;
  label: string;
}

export function useActiveLanguages(): LanguageOption[] {
  const [languages, setLanguages] = useState<LanguageOption[]>(TRANSLITERATION_LANGUAGES);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await (supabase as any)
          .from("languages")
          .select("code, name")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: LanguageOption[] = data.map((r: any) => ({
            value: r.code as TransliterationLanguage,
            label: r.name as string,
          }));
          setLanguages(mapped);
        }
      } catch {
        setLanguages(TRANSLITERATION_LANGUAGES);
      }
    }
    fetch();
  }, []);

  return languages;
}
