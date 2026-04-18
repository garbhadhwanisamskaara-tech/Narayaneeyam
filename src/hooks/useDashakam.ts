import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DashakamListItem {
  dashakam_no: number;
  dashakam_name: string;
  num_verses: number;
  remarks: string | null;
  gist: string | null;
  benefits: string | null;
}

export interface MergedVerse {
  verse_no: number;
  chant_audio_file: string;
  sloka_audio_id: string | null;
  sanskrit_text: string;
  meter: string;
  transliteration_text: string;
  translation_text: string;
  prasadam_text: string;
}

interface UseDashakamResult {
  dashakamList: DashakamListItem[];
  verses: MergedVerse[];
  loading: boolean;
  error: string | null;
  audioReady: boolean;
}

const DASHAKAM_SEED: DashakamListItem[] = Array.from({ length: 100 }, (_, i) => ({
  dashakam_no: i + 1,
  dashakam_name: `Dashakam ${i + 1}`,
  num_verses: 10,
  remarks: null,
  gist: null,
  benefits: null,
}));

// ---- simple cache (per-language for dashakam list) ----
const dashakamListCacheByLang = new Map<string, DashakamListItem[]>();
const dashakamListInflight = new Map<string, Promise<DashakamListItem[]>>();
// Seed English so first render isn't empty
dashakamListCacheByLang.set("en", DASHAKAM_SEED);

const verseCache = new Map<string, MergedVerse[]>();

const getKey = (d: number, l: string) => `${d}_${l}`;

async function fetchDashakamListForLang(lang: string): Promise<DashakamListItem[]> {
  const { data, error } = await supabase
    .from("dashakams")
    .select("dashakam_no, dashakam_name, num_verses, remarks, gist, benefits")
    .eq("language_code", lang)
    .order("dashakam_no");

  if (error) throw error;

  const seen = new Set<number>();
  return (data || []).filter((d: any) => {
    if (seen.has(d.dashakam_no)) return false;
    seen.add(d.dashakam_no);
    return true;
  }) as DashakamListItem[];
}

/** Fetch dashakam list in given language; fall back to English if empty. Cached per language. */
async function fetchDashakamList(lang: string = "en"): Promise<DashakamListItem[]> {
  const cached = dashakamListCacheByLang.get(lang);
  // Treat the seeded English as "not really fetched" so we still hit DB once
  if (cached && cached !== DASHAKAM_SEED) return cached;

  const inflight = dashakamListInflight.get(lang);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      let list = await fetchDashakamListForLang(lang);

      // Fallback to English names if requested language has no rows
      if (list.length === 0 && lang !== "en") {
        console.log(`[useDashakam] no dashakams for '${lang}', falling back to 'en'`);
        list = await fetchDashakamListForLang("en");
      }

      if (list.length > 0) {
        dashakamListCacheByLang.set(lang, list);
      }
      console.log(`[useDashakam] fetched dashakam list [${lang}]:`, list.length, "items");
      return list.length > 0 ? list : (dashakamListCacheByLang.get("en") ?? DASHAKAM_SEED);
    } catch (err) {
      console.error("[useDashakam] fetchDashakamList failed:", err);
      throw err;
    } finally {
      dashakamListInflight.delete(lang);
    }
  })();

  dashakamListInflight.set(lang, promise);
  return promise;
}

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en"
): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>(
    () => dashakamListCacheByLang.get(selectedLanguage) || dashakamListCacheByLang.get("en") || DASHAKAM_SEED
  );
  const [verses, setVerses] = useState<MergedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestRef.current;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1. DASHAKAM LIST
        const list = await fetchDashakamList(selectedLanguage);

        if (!isMounted || requestId !== requestRef.current) return;
        setDashakamList(list);

        // 2. VERSES (with cache)
        const key = getKey(selectedDashakam, selectedLanguage);
        let merged = verseCache.get(key);

        if (!merged) {
          // Fetch audio, Sanskrit script, target language, and prasadam in parallel
          // IMPORTANT: fetch Sanskrit and target language SEPARATELY to avoid map overwrite
          const [audio, scriptSa, langTarget, prasTarget] = await Promise.all([
            supabase
              .from("verses_audio")
              .select("verse_no, chant_audio_file, sloka_audio_id, meter")
              .eq("dashakam_no", selectedDashakam)
              .order("verse_no"),

            // Sanskrit script (Devanagari text)
            supabase
              .from("language_script")
              .select("verse_no, transliteration_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", "sa")
              .order("verse_no"),

            // Target language transliteration + translation (e.g. "en", "mr", "ta")
            supabase
              .from("language_script")
              .select("verse_no, transliteration_text, translation_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", selectedLanguage)
              .order("verse_no"),

            // Prasadam in target language
            supabase
              .from("prasadam")
              .select("verse_no, prasadam_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", selectedLanguage)
              .order("verse_no"),
          ]);

          const toMap = (arr: any[] | null) =>
            Object.fromEntries((arr || []).map((r) => [r.verse_no, r]));

          const a = toMap(audio.data);
          const s = toMap(scriptSa.data);   // Sanskrit
          let l = toMap(langTarget.data);   // Target language (en/ta/mr/etc)
          let p = toMap(prasTarget.data);

          // Fallback to English if target language has no script rows OR
          // any verse is missing translation_text (per-verse fallback)
          const needsEnglishFallback =
            selectedLanguage !== "en" &&
            (Object.keys(l).length === 0 ||
              Object.values(l).some(
                (r: any) => !r?.translation_text || r.translation_text.trim() === ""
              ));

          let lEn: Record<string, any> = {};
          if (needsEnglishFallback) {
            const langEn = await supabase
              .from("language_script")
              .select("verse_no, transliteration_text, translation_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", "en")
              .order("verse_no");
            lEn = toMap(langEn.data);
            // If selected lang had no rows at all, use English as base
            if (Object.keys(l).length === 0) {
              l = lEn;
            }
          }
          // Fallback prasadam to English if missing
          if (selectedLanguage !== "en" && Object.keys(p).length === 0) {
            const prasEn = await supabase
              .from("prasadam")
              .select("verse_no, prasadam_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", "en")
              .order("verse_no");
            p = toMap(prasEn.data);
          }

          // Determine verse count from dashakam metadata or data
          const dk = list.find((d) => d.dashakam_no === selectedDashakam);
          const max = dk?.num_verses || Math.max(
            ...Object.keys(a).map(Number),
            ...Object.keys(s).map(Number),
            0
          );

          merged = [];
          for (let i = 1; i <= max; i++) {
            const translation =
              (l[i]?.translation_text && l[i].translation_text.trim() !== ""
                ? l[i].translation_text
                : lEn[i]?.translation_text) ?? "";
            merged.push({
              verse_no: i,
              chant_audio_file: a[i]?.chant_audio_file ?? "",
              sloka_audio_id: a[i]?.sloka_audio_id ?? null,
              sanskrit_text: s[i]?.transliteration_text ?? "",
              meter: a[i]?.meter ?? "",
              transliteration_text: l[i]?.transliteration_text ?? "",
              translation_text: translation,
              prasadam_text: p[i]?.prasadam_text ?? "",
            });
          }

          verseCache.set(key, merged);
        }

        if (!isMounted || requestId !== requestRef.current) return;
        setVerses(merged);
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[useDashakam] error:", err.message);
        setError(err.message || "Failed to load data");
      } finally {
        if (!isMounted || requestId !== requestRef.current) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [selectedDashakam, selectedLanguage]);

  const audioReady =
    !loading &&
    verses.length > 0 &&
    verses.some((v) => v.chant_audio_file);

  return { dashakamList, verses, loading, error, audioReady };
}

/** Get dashakam name from cached list — also triggers fetch if cache empty */
export function getDashakamName(dashakamNo: number, lang: string = "en"): string {
  const list = dashakamListCacheByLang.get(lang) || dashakamListCacheByLang.get("en");
  if (list && list !== DASHAKAM_SEED) {
    const item = list.find((d) => d.dashakam_no === dashakamNo);
    if (item) return item.dashakam_name || `Dashakam ${dashakamNo}`;
  }
  fetchDashakamList(lang).catch(() => {});
  return `Dashakam ${dashakamNo}`;
}

/** Prefetch dashakam list — can be called from any page */
export function prefetchDashakamList(lang: string = "en"): Promise<DashakamListItem[]> {
  return fetchDashakamList(lang);
}
