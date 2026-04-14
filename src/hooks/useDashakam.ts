import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureAppError } from "@/monitoring/sentry";

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
  sanskrit_text: string;
  meter: string;
  chant_audio_file: string;
  sloka_audio_id: string | null;
  transliteration_text: string;
  translation_text: string;
  prasadam_text: string;
}

interface UseDashakamResult {
  dashakamList: DashakamListItem[];
  verses: MergedVerse[];
  loading: boolean;
  error: string | null;
  /** True when verses have real audio file paths */
  audioReady: boolean;
}

// ── In-memory caches ──
const verseCache = new Map<string, MergedVerse[]>();
let dashakamListCache: DashakamListItem[] | null = null;
let dashakamListPromise: Promise<DashakamListItem[]> | null = null;
let dashakamListAttempts = 0;

function getCacheKey(dashakam: number, lang: string) {
  return `${dashakam}:${lang}`;
}

async function fetchDashakamList(): Promise<DashakamListItem[]> {
  if (dashakamListCache) return dashakamListCache;
  if (dashakamListPromise) return dashakamListPromise;

  dashakamListAttempts++;
  const attempt = dashakamListAttempts;
  console.log(`[useDashakam] fetchDashakamList attempt #${attempt}`);

  dashakamListPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from("dashakams")
        .select("dashakam_no, dashakam_name, num_verses, remarks, gist, benefits")
        .eq("language_code", "en")
        .order("dashakam_no");
      console.log(`[useDashakam] dashakams query result: error=${!!error}, rows=${data?.length ?? 0}`);
      if (error) {
        console.error("[useDashakam] dashakams query error:", error.message, error.code);
        dashakamListPromise = null;
        return [];
      }
      if (!data || data.length === 0) {
        console.warn("[useDashakam] dashakams returned 0 rows — possible RLS issue");
        dashakamListPromise = null;
        return [];
      }
      // Deduplicate: keep only the first (transliterated) row per dashakam_no
      const seen = new Set<number>();
      const list: DashakamListItem[] = [];
      for (const row of data as DashakamListItem[]) {
        if (!seen.has(row.dashakam_no)) {
          seen.add(row.dashakam_no);
          list.push(row);
        }
      }
      console.log(`[useDashakam] dashakamList loaded: ${list.length} dashakams`);
      dashakamListCache = list;
      return list;
    } catch (err: any) {
      console.error("[useDashakam] fetchDashakamList exception:", err?.message);
      dashakamListPromise = null;
      return [];
    }
  })();

  return dashakamListPromise;
}

async function fetchVerses(
  selectedDashakam: number,
  selectedLanguage: string,
  numVerses: number,
): Promise<MergedVerse[]> {
  const cacheKey = getCacheKey(selectedDashakam, selectedLanguage);
  const cached = verseCache.get(cacheKey);
  if (cached) return cached;

  const [audioRes, scriptRes, langRes, prasRes] = await withTimeout(
    Promise.all([
      executeQuery(
        supabase
          .from("verses_audio")
          .select("verse_no, chant_audio_file, sloka_audio_id")
          .eq("dashakam_no", selectedDashakam)
          .order("verse_no"),
      ),
      executeQuery(
        supabase
          .from("language_script")
          .select("verse_no, transliteration_text, translation_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", "sa")
          .order("verse_no"),
      ),
      executeQuery(
        supabase
          .from("language_script")
          .select("verse_no, transliteration_text, translation_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", selectedLanguage)
          .order("verse_no"),
      ),
      executeQuery(
        supabase
          .from("prasadam")
          .select("verse_no, prasadam_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", selectedLanguage)
          .order("verse_no"),
      ),
    ]),
    15000,
  );

  const audioMap: Record<number, any> = {};
  (audioRes.data ?? []).forEach((r: any) => { audioMap[r.verse_no] = r; });
  const scriptMap: Record<number, any> = {};
  (scriptRes.data ?? []).forEach((r: any) => { scriptMap[r.verse_no] = r; });
  const langMap: Record<number, any> = {};
  (langRes.data ?? []).forEach((r: any) => { langMap[r.verse_no] = r; });
  const prasMap: Record<number, any> = {};
  (prasRes.data ?? []).forEach((r: any) => { prasMap[r.verse_no] = r; });

  const count = numVerses || Math.max(
    ...Object.keys(audioMap).map(Number),
    ...Object.keys(scriptMap).map(Number),
    0,
  );

  const merged: MergedVerse[] = [];
  for (let v = 1; v <= count; v++) {
    const a = audioMap[v];
    const s = scriptMap[v];
    const l = langMap[v];
    const p = prasMap[v];
    merged.push({
      verse_no: v,
      sanskrit_text: s?.transliteration_text ?? "",
      meter: a?.meter ?? "",
      
      chant_audio_file: a?.chant_audio_file ?? "",
      sloka_audio_id: a?.sloka_audio_id ?? null,
      transliteration_text: l?.transliteration_text ?? "",
      translation_text: l?.translation_text ?? "",
      prasadam_text: p?.prasadam_text ?? "",
    });
  }

  verseCache.set(cacheKey, merged);
  return merged;
}

/** Call after auth is ready to prefetch dashakam list */
export function prefetchDashakamList(): void {
  fetchDashakamList().catch(() => {});
}

export function useDashakam(selectedDashakam: number, selectedLanguage: string = "en"): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>(dashakamListCache ?? []);
  const [verses, setVerses] = useState<MergedVerse[]>(() => {
    return verseCache.get(getCacheKey(selectedDashakam, selectedLanguage)) ?? [];
  });
  const [loading, setLoading] = useState(() => {
    return !verseCache.has(getCacheKey(selectedDashakam, selectedLanguage));
  });
  const [error, setError] = useState<string | null>(null);

  // Load dashakam list — retry up to 3 times if empty
  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function load(retries = 0) {
      const list = await fetchDashakamList();
      if (cancelled) return;
      if (list.length > 0) {
        setDashakamList(list);
      } else if (retries < 3) {
        console.log(`[useDashakam] dashakamList empty, retrying in ${(retries + 1) * 1500}ms...`);
        retryTimer = setTimeout(() => load(retries + 1), (retries + 1) * 1500);
      } else {
        console.error("[useDashakam] dashakamList empty after 3 retries");
      }
    }

    load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Load verse data
  useEffect(() => {
    let cancelled = false;
    const cacheKey = getCacheKey(selectedDashakam, selectedLanguage);
    const cached = verseCache.get(cacheKey);

    if (cached) {
      setVerses(cached);
      setLoading(false);
      setError(null);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        // Get num_verses from dashakam list
        const list = await fetchDashakamList();
        const dk = list.find((d) => d.dashakam_no === selectedDashakam);
        const numVerses = dk?.num_verses ?? 10;

        const result = await fetchVerses(selectedDashakam, selectedLanguage, numVerses);
        if (!cancelled) {
          setVerses(result);
        }
      } catch (err: any) {
        captureAppError(err, { component: "dashakam", dashakam_no: selectedDashakam });
        if (!cancelled) {
          setError(err.message ?? "Failed to load dashakam data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedDashakam, selectedLanguage]);

  // Audio is ready when we have verses with non-empty chant_audio_file
  const audioReady =
    !loading &&
    verses.length > 0 &&
    verses.some((v) => v.chant_audio_file && v.chant_audio_file.length > 0);

  return { dashakamList, verses, loading, error, audioReady };
}

/** Get dashakam name from cached list */
export function getDashakamName(dashakamNo: number): string {
  const item = dashakamListCache?.find((d) => d.dashakam_no === dashakamNo);
  return item?.dashakam_name || `Dashakam ${dashakamNo}`;
}
