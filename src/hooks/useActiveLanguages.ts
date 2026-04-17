import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LanguageOption {
  value: string; // 2-letter language_code as stored in Supabase (e.g. "en", "sa", "mr")
  label: string;
}

// Static fallback uses the same 2-letter codes the DB stores, so downstream
// queries against language_script / prasadam continue to work even offline.
const FALLBACK_LANGUAGES: LanguageOption[] = [
  { value: "sa", label: "Sanskrit" },
  { value: "en", label: "English" },
  { value: "ta", label: "Tamil" },
];

export function useActiveLanguages(): LanguageOption[] {
  const [languages, setLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);

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
            value: r.code as string,
            label: r.name as string,
          }));
          setLanguages(mapped);
        }
      } catch {
        setLanguages(FALLBACK_LANGUAGES);
      }
    }
    fetch();
  }, []);

  return languages;
}
