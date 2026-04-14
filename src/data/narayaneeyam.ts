/**
 * Narayaneeyam type definitions and language constants.
 * All actual data comes from Supabase — no hardcoded content.
 */

export type TransliterationLanguage = "sanskrit" | "english" | "tamil" | "malayalam" | "telugu" | "kannada";
export type TranslationLanguage = "english" | "tamil" | "malayalam" | "telugu" | "kannada" | "hindi" | "marathi";
export type Language = "sanskrit" | "english" | "tamil" | "telugu" | "malayalam" | "kannada" | "hindi" | "marathi";

// All supported transliteration languages (DB schema supports all)
export const ALL_TRANSLITERATION_LANGUAGES: { value: TransliterationLanguage; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit (Devanagari)" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
];

// MVP: only these are shown in dropdowns
export const TRANSLITERATION_LANGUAGES: { value: TransliterationLanguage; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit (Devanagari)" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
];

// All supported translation languages (DB schema supports all)
export const ALL_TRANSLATION_LANGUAGES: { value: TranslationLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "malayalam", label: "Malayalam" },
  { value: "telugu", label: "Telugu" },
  { value: "kannada", label: "Kannada" },
  { value: "hindi", label: "Hindi" },
  { value: "marathi", label: "Marathi" },
];

// MVP: only these are shown in dropdowns
export const TRANSLATION_LANGUAGES: { value: TranslationLanguage; label: string }[] = [
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
];

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "sanskrit", label: "Sanskrit" },
  { value: "english", label: "English" },
  { value: "tamil", label: "Tamil" },
  { value: "telugu", label: "Telugu" },
  { value: "malayalam", label: "Malayalam" },
  { value: "hindi", label: "Hindi" },
  { value: "marathi", label: "Marathi" },
];

export const TOTAL_DASHAKAMS = 100;
export const TOTAL_VERSES = 1034;
