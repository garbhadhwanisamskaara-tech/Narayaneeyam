export interface Verse {
  id: string;
  dashakam: number;
  paragraph: number;
  sanskrit: string;
  english: string;
  tamil: string;
  telugu: string;
  malayalam: string;
  kannada: string;
  hindi: string;
  marathi: string;
  meaning_english: string;
  meaning_tamil: string;
  meaning_telugu: string;
  meaning_malayalam: string;
  meaning_kannada: string;
  meaning_hindi: string;
  meaning_marathi: string;
  meter: string;
  prasadam?: string;
  bell?: boolean;
  benefits?: string;
  audio?: string;
}

export interface Dashakam {
  id: number;
  title_sanskrit: string;
  title_english: string;
  title_transliteration: string;
  description: string;
  gist: string;
  benefits: string;
  meter: number;
  num_verses: number;
  bell_verses: number[];
  prasadam_info: { verse: number; item: string }[];
  remarks?: string;
  verses: Verse[];
  imageUrl?: string;
}

// Full language support in data schema
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

function parsePrasadamInfo(raw: string): { verse: number; item: string }[] {
  if (!raw) return [];
  return raw
    .split(";")
    .map((s) => {
      const parts = s.trim().split("-");
      return { verse: parseInt(parts[0]), item: parts.slice(1).join("-").trim() };
    })
    .filter((p) => !isNaN(p.verse));
}

function parseBellVerses(raw: string): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => !isNaN(n));
}

export function verseShouldShowBell(dashakam: Dashakam, verseNumber: number): boolean {
  return dashakam.bell_verses.includes(verseNumber);
}

export function getVersePrasadam(dashakam: Dashakam, verseNumber: number): string | undefined {
  const info = dashakam.prasadam_info.find((p) => p.verse === verseNumber);
  return info?.item;
}

function makeVerse(
  dashakam: number,
  paragraph: number,
  opts: Partial<Verse> & { english: string; meaning_english: string },
): Verse {
  return {
    id: `${dashakam}-${paragraph}`,
    dashakam,
    paragraph,
    sanskrit: opts.sanskrit || "",
    english: opts.english,
    tamil: opts.tamil || "",
    telugu: opts.telugu || "",
    malayalam: opts.malayalam || "",
    kannada: opts.kannada || "",
    hindi: opts.hindi || "",
    marathi: opts.marathi || "",
    meaning_english: opts.meaning_english,
    meaning_tamil: opts.meaning_tamil || "",
    meaning_telugu: opts.meaning_telugu || "",
    meaning_malayalam: opts.meaning_malayalam || "",
    meaning_kannada: opts.meaning_kannada || "",
    meaning_hindi: opts.meaning_hindi || "",
    meaning_marathi: opts.meaning_marathi || "",
    meter: opts.meter || "Sragdharā",
    prasadam: opts.prasadam,
    bell: opts.bell,
    benefits: opts.benefits,
    audio: opts.audio,
  };
}

export const TOTAL_DASHAKAMS = 100;
export const TOTAL_VERSES = 1034;
