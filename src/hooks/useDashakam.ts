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

// ---- simple cache ----
const dashakamCache: { list: DashakamListItem[]; fetched: boolean; loading: Promise<DashakamListItem[]> | null } = {
  list: DASHAKAM_SEED,
  fetched: false,
  loading: null,
};
const verseCache = new Map<string, MergedVerse[]>();

const getKey = (d: number, l: string) => `${d}_${l}`;

/** Fetch dashakam list (shared, deduped) */
async function fetchDashakamList(): Promise<DashakamListItem[]> {
  if (dashakamCache.fetched) return dashakamCache.list;
  if (dashakamCache.loading) return dashakamCache.loading;

  dashakamCache.loading = (async () => {
    try {
      const { data, error } = await supabase
        .from("dashakams")
        .select("dashakam_no, dashakam_name, num_verses, remarks, gist, benefits")
        .eq("language_code", "en")
        .order("dashakam_no");

      if (error) throw error;

      // dedupe
      const seen = new Set<number>();
      const list = (data || []).filter((d) => {
        if (seen.has(d.dashakam_no)) return false;
        seen.add(d.dashakam_no);
        return true;
      });

      dashakamCache.list = list;
      dashakamCache.fetched = true;
      console.log("[useDashakam] fetched dashakam list:", list.length, "items");
      return list;
    } catch (err) {
      console.error("[useDashakam] fetchDashakamList failed:", err);
      throw err;
    } finally {
      dashakamCache.loading = null; // always reset, even on failure
    }
  })();

  return dashakamCache.loading;
}

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en"
): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>(dashakamCache.list || []);
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
        const list = await fetchDashakamList();

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
              .select("verse_no, chant_audio_file, sloka_audio_id")
              .eq("dashakam_no", selectedDashakam)
              .order("verse_no"),

            // Sanskrit script (Devanagari text)
            supabase
              .from("language_script")
              .select("verse_no, transliteration_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", "sa")
              .order("verse_no"),

            // Target language transliteration + translation (e.g. "en")
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
          const l = toMap(langTarget.data);  // Target language (en/ta/etc)
          const p = toMap(prasTarget.data);

          // Determine verse count from dashakam metadata or data
          const dk = list.find((d) => d.dashakam_no === selectedDashakam);
          const max = dk?.num_verses || Math.max(
            ...Object.keys(a).map(Number),
            ...Object.keys(s).map(Number),
            0
          );

          merged = [];
          for (let i = 1; i <= max; i++) {
            merged.push({
              verse_no: i,
              chant_audio_file: a[i]?.chant_audio_file ?? "",
              sloka_audio_id: a[i]?.sloka_audio_id ?? null,
              sanskrit_text: s[i]?.transliteration_text ?? "",
              meter: a[i]?.meter ?? "",
              transliteration_text: l[i]?.transliteration_text ?? "",
              translation_text: l[i]?.translation_text ?? "",
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
export function getDashakamName(dashakamNo: number): string {
  // If cache exists, return from it
  if (dashakamCache.list) {
    const item = dashakamCache.list.find((d) => d.dashakam_no === dashakamNo);
    return item?.dashakam_name || `Dashakam ${dashakamNo}`;
  }
  // Trigger background fetch so names are available next render
  fetchDashakamList().catch(() => {});
  return `Dashakam ${dashakamNo}`;
}

/** Prefetch dashakam list — can be called from any page */
export function prefetchDashakamList(): Promise<DashakamListItem[]> {
  return fetchDashakamList();
}
