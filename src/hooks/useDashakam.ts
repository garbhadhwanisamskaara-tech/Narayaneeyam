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

// ---- simple cache ----
const dashakamCache: { list: DashakamListItem[] | null } = { list: null };
const verseCache = new Map<string, MergedVerse[]>();

const getKey = (d: number, l: string) => `${d}_${l}`;

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en"
): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>([]);
  const [verses, setVerses] = useState<MergedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestRef = useRef(0); // prevents race condition

  useEffect(() => {
    let isMounted = true;
    const requestId = ++requestRef.current;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // 1. DASHAKAM LIST
        let list = dashakamCache.list;

        if (!list) {
          const { data, error } = await supabase
            .from("dashakams")
            .select("dashakam_no, dashakam_name, num_verses, remarks, gist, benefits")
            .in("language_code", ["en", "sa"])
            .order("dashakam_no");

          if (error) throw error;

          // dedupe
          const seen = new Set<number>();
          list = (data || []).filter((d) => {
            if (seen.has(d.dashakam_no)) return false;
            seen.add(d.dashakam_no);
            return true;
          });

          dashakamCache.list = list;
        }

        if (!isMounted || requestId !== requestRef.current) return;
        setDashakamList(list || []);

        // 2. VERSES (with cache)
        const key = getKey(selectedDashakam, selectedLanguage);
        let merged = verseCache.get(key);

        if (!merged) {
          const [audio, script, lang, pras] = await Promise.all([
            supabase
              .from("verses_audio")
              .select("verse_no, chant_audio_file, sloka_audio_id")
              .eq("dashakam_no", selectedDashakam),

            supabase
              .from("language_script")
              .select("verse_no, transliteration_text")
              .eq("dashakam_no", selectedDashakam)
              .eq("language_code", "sa"),

            supabase
              .from("language_script")
              .select("verse_no, transliteration_text, translation_text")
              .eq("dashakam_no", selectedDashakam)
              .in("language_code", [selectedLanguage, "sa"]),

            supabase
              .from("prasadam")
              .select("verse_no, prasadam_text")
              .eq("dashakam_no", selectedDashakam)
              .in("language_code", [selectedLanguage, "sa"]),
          ]);

          const map = (arr: any[]) =>
            Object.fromEntries((arr || []).map((r) => [r.verse_no, r]));

          const a = map(audio.data);
          const s = map(script.data);
          const l = map(lang.data);
          const p = map(pras.data);

          const max = Math.max(
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

/** Get dashakam name from cached list */
export function getDashakamName(dashakamNo: number): string {
  const item = dashakamCache.list?.find((d) => d.dashakam_no === dashakamNo);
  return item?.dashakam_name || `Dashakam ${dashakamNo}`;
}

/** Prefetch dashakam list (no-op kept for backward compat) */
export function prefetchDashakamList(): void {
  // no longer used — data loads on ChantPage mount
}
