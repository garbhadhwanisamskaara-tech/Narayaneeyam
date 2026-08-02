import { useAuth } from "@/contexts/AuthContext";

export const DEFAULT_LANGUAGE = "en";

/**
 * Single source of truth for the languages used to display content.
 * Set at sign-up and changeable only from My Preferences.
 */
export function useLanguagePrefs(): { scriptLang: string; translationLang: string } {
  const { profile } = useAuth() as {
    profile?: {
      preferred_script_language?: string | null;
      preferred_translation_language?: string | null;
    } | null;
  };

  const scriptLang = profile?.preferred_script_language || DEFAULT_LANGUAGE;
  const translationLang =
    profile?.preferred_translation_language || scriptLang || DEFAULT_LANGUAGE;

  return { scriptLang, translationLang };
}
