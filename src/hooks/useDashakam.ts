import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureAppError } from "@/monitoring/sentry";
import { sampleDashakams, type Dashakam } from "@/data/narayaneeyam";

export interface DashakamListItem {
  dashakam_no: number;
  dashakam_name: string;
  num_verses: number;
  remarks: string | null;
}

export interface MergedVerse {
  verse_no: number;
  sanskrit_text: string;
  meter: string;
  has_bell: boolean;
  chant_audio_file: string;
  learn_audio_file: string;
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
  staticDashakam: Dashakam | undefined;
}

// ── In-memory verse cache ──
const verseCache = new Map<string, MergedVerse[]>();
let dashakamListCache: DashakamListItem[] | null = null;

function getCacheKey(dashakam: number, lang: string) {
  return `${dashakam}:${lang}`;
}

/** Build static fallback verses from bundled data */
function buildStaticVerses(staticDashakam: Dashakam): MergedVerse[] {
  return staticDashakam.verses.map((v) => ({
    verse_no: v.paragraph,
    sanskrit_text: v.sanskrit,
    meter: v.meter,
    has_bell: v.bell ?? false,
    chant_audio_file: v.audio ?? "",
    learn_audio_file: "",
    sloka_audio_id: null,
    transliteration_text: v.english,
    translation_text: v.meaning_english,
    prasadam_text: v.prasadam ?? "",
  }));
}

/** Race a promise against a timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout")), ms)
    ),
  ]);
}

async function fetchVerses(
  selectedDashakam: number,
  selectedLanguage: string,
  staticDashakam: Dashakam | undefined,
  skipCache = false
): Promise<MergedVerse[]> {
  const cacheKey = getCacheKey(selectedDashakam, selectedLanguage);
  if (!skipCache) {
    const cached = verseCache.get(cacheKey);
    if (cached) return cached;
  }

  // If we have static data, use it as immediate fallback while trying DB
  try {
    const [audioRes, scriptRes, langRes, prasRes] = await withTimeout(
      Promise.all([
        supabase
          .from("verses_audio")
          .select("verse_no, chant_audio_file, learn_audio_file, sloka_audio_id")
          .eq("dashakam_no", selectedDashakam)
          .order("verse_no"),
        supabase
          .from("language_script")
          .select("verse_no, transliteration_text, translation_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", "sa")
          .order("verse_no"),
        supabase
          .from("language_script")
          .select("verse_no, transliteration_text, translation_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", selectedLanguage)
          .order("verse_no"),
        supabase
          .from("prasadam")
          .select("verse_no, prasadam_text")
          .eq("dashakam_no", selectedDashakam)
          .eq("language_code", selectedLanguage)
          .order("verse_no"),
      ]),
      8000 // 8s timeout
    );

    const hasDbData =
      (audioRes.data && audioRes.data.length > 0) ||
      (scriptRes.data && scriptRes.data.length > 0);

    if (!hasDbData && staticDashakam) {
      const staticVerses = buildStaticVerses(staticDashakam);
      verseCache.set(cacheKey, staticVerses);
      return staticVerses;
    }

    const audioMap: Record<number, any> = {};
    (audioRes.data ?? []).forEach((r: any) => { audioMap[r.verse_no] = r; });
    const scriptMap: Record<number, any> = {};
    (scriptRes.data ?? []).forEach((r: any) => { scriptMap[r.verse_no] = r; });
    const langMap: Record<number, any> = {};
    (langRes.data ?? []).forEach((r: any) => { langMap[r.verse_no] = r; });
    const prasMap: Record<number, any> = {};
    (prasRes.data ?? []).forEach((r: any) => { prasMap[r.verse_no] = r; });

    const numVerses =
      staticDashakam?.num_verses ??
      Math.max(
        ...Object.keys(audioMap).map(Number),
        ...Object.keys(scriptMap).map(Number),
        10
      );

    const merged: MergedVerse[] = [];
    for (let v = 1; v <= numVerses; v++) {
      const a = audioMap[v];
      const s = scriptMap[v];
      const l = langMap[v];
      const p = prasMap[v];
      const sv = staticDashakam?.verses.find((x) => x.paragraph === v);

      merged.push({
        verse_no: v,
        sanskrit_text: s?.transliteration_text ?? sv?.sanskrit ?? "",
        meter: "",
        has_bell: false,
        chant_audio_file: a?.chant_audio_file ?? sv?.audio ?? "",
        learn_audio_file: a?.learn_audio_file ?? "",
        sloka_audio_id: a?.sloka_audio_id ?? null,
        transliteration_text: l?.transliteration_text ?? sv?.english ?? "",
        translation_text: l?.translation_text ?? sv?.meaning_english ?? "",
        prasadam_text: p?.prasadam_text ?? sv?.prasadam ?? "",
      });
    }

    verseCache.set(cacheKey, merged);
    return merged;
  } catch (err) {
    // On any failure (timeout, network, etc.), fall back to static data
    if (staticDashakam) {
      const staticVerses = buildStaticVerses(staticDashakam);
      verseCache.set(cacheKey, staticVerses);
      return staticVerses;
    }
    throw err;
  }
}

// ── Preload Dashakam 1 on module load ──
const d1Static = sampleDashakams.find((d) => d.id === 1);
if (d1Static) {
  // Immediately cache static data so it's available even before DB responds
  const staticVerses = buildStaticVerses(d1Static);
  verseCache.set(getCacheKey(1, "en"), staticVerses);
  // Then try to upgrade with DB data in background
  fetchVerses(1, "en", d1Static, true).catch(() => {});
}

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en"
): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>(dashakamListCache ?? []);
  const [verses, setVerses] = useState<MergedVerse[]>(() => {
    return verseCache.get(getCacheKey(selectedDashakam, selectedLanguage)) ?? [];
  });
  const [loading, setLoading] = useState(() => {
    return !verseCache.has(getCacheKey(selectedDashakam, selectedLanguage));
  });
  const [error, setError] = useState<string | null>(null);

  const staticDashakam = sampleDashakams.find((d) => d.id === selectedDashakam);

  // Load dashakam list once
  useEffect(() => {
    if (dashakamListCache) { setDashakamList(dashakamListCache); return; }
    (async () => {
      try {
        const { data, error: err } = await withTimeout(
          Promise.resolve(
            supabase
              .from("dashakams")
              .select("dashakam_no, dashakam_name, num_verses, remarks")
              .eq("language_code", "en")
              .eq("is_published", true)
              .order("dashakam_no")
          ),
          5000
        );

        const fallback = sampleDashakams.map((d) => ({
          dashakam_no: d.id,
          dashakam_name: d.title_english,
          num_verses: d.num_verses,
          remarks: d.remarks ?? null,
        }));

        const list = err || !data || data.length === 0 ? fallback : (data as DashakamListItem[]);
        dashakamListCache = list;
        setDashakamList(list);
      } catch {
        const fallback = sampleDashakams.map((d) => ({
          dashakam_no: d.id,
          dashakam_name: d.title_english,
          num_verses: d.num_verses,
          remarks: d.remarks ?? null,
        }));
        dashakamListCache = fallback;
        setDashakamList(fallback);
      }
    })();
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
      // If cached data has no real audio (static fallback), try DB upgrade in background
      const hasRealAudio = cached.some(v => v.chant_audio_file && !v.chant_audio_file.startsWith("/audio/"));
      if (!hasRealAudio) {
        fetchVerses(selectedDashakam, selectedLanguage, staticDashakam, true)
          .then((result) => { if (!cancelled) setVerses(result); })
          .catch(() => {});
      }
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const result = await fetchVerses(selectedDashakam, selectedLanguage, staticDashakam);
        if (!cancelled) {
          setVerses(result);
        }
      } catch (err: any) {
        captureAppError(err, { component: "dashakam", dashakam_no: selectedDashakam });
        if (!cancelled) {
          setError(err.message ?? "Failed to load dashakam data");
          if (staticDashakam) {
            setVerses(buildStaticVerses(staticDashakam));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };

    return () => { cancelled = true; };
  }, [selectedDashakam, selectedLanguage]);

  return { dashakamList, verses, loading, error, staticDashakam };
}
