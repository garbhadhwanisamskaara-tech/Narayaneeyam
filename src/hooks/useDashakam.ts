import { useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryClient } from "@/lib/queryClient";

export interface DashakamListItem {
  dashakam_no: number;
  dashakam_name: string;
  num_verses: number;
  remarks: string | null;
  gist: string | null;
  benefits: string | null;
  is_published: boolean;
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
  /** Language the translation_text is actually in (may be "en" fallback). */
  translation_language: string;
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
  is_published: true,
}));

/** Content is effectively static; keep it fresh for a while but still invalidatable. */
const LIST_STALE_TIME = 30 * 60 * 1000;
const VERSE_STALE_TIME = 30 * 60 * 1000;
const GC_TIME = 60 * 60 * 1000;

const listKey = (lang: string) => ["dashakam-list", lang] as const;
const versesKey = (d: number, script: string, translation: string) =>
  ["dashakam-verses", d, script, translation] as const;

function saveDataEnabled(): boolean {
  const conn = (navigator as any)?.connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  const t = conn.effectiveType;
  return t === "2g" || t === "slow-2g";
}

async function fetchDashakamRows(
  lang: string,
  publishedOnly: boolean,
  signal?: AbortSignal
): Promise<DashakamListItem[]> {
  let query = supabase
    .from("dashakams")
    .select("dashakam_no, dashakam_name, num_verses, remarks, gist, benefits, is_published")
    .eq("language_code", lang);

  if (publishedOnly) query = query.eq("is_published", true);

  const { data, error } = await query.order("dashakam_no").abortSignal(signal!);
  if (error) throw error;

  const seen = new Set<number>();
  return (data || []).filter((d: any) => {
    if (seen.has(d.dashakam_no)) return false;
    seen.add(d.dashakam_no);
    return true;
  }) as DashakamListItem[];
}

/**
 * Fetch dashakam list in the given language.
 * Publication status lives only on the canonical English rows, so the English
 * published set decides WHICH dashakams show, while the requested language
 * supplies the names (falling back to English per-dashakam when missing).
 */
async function fetchDashakamList(lang: string, signal?: AbortSignal): Promise<DashakamListItem[]> {
  // All 100 dashakams are listed; `is_published` marks which ones are ready.
  const published = await fetchDashakamRows("en", false, signal);

  let list = published;
  if (lang !== "en") {
    // Localized names are optional — never fail the whole list for them.
    try {
      const localized = await fetchDashakamRows(lang, false, signal);
      const locMap = new Map(localized.map((d) => [d.dashakam_no, d]));
      list = published.map((d) => {
        const t = locMap.get(d.dashakam_no);
        return t
          ? {
              ...d,
              dashakam_name: t.dashakam_name || d.dashakam_name,
              gist: t.gist ?? d.gist,
              benefits: t.benefits ?? d.benefits,
              remarks: t.remarks ?? d.remarks,
            }
          : d;
      });
    } catch {
      // keep English metadata
    }
  }

  return list.length > 0 ? list : DASHAKAM_SEED;
}

function listQueryOptions(lang: string) {
  return {
    queryKey: listKey(lang),
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchDashakamList(lang, signal),
    staleTime: LIST_STALE_TIME,
    gcTime: GC_TIME,
  };
}

/**
 * Hardcoded display-order overrides: some dashakams' audio follows a custom
 * verse sequence. Verse numbers stay unchanged — only iteration order changes.
 */
export const DASHAKAM_VERSE_ORDER_OVERRIDE: Record<number, number[]> = {
  45: [11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
};

/** Reorder verses per DASHAKAM_VERSE_ORDER_OVERRIDE; other dashakams untouched. */
export function applyVerseOrderOverride<T extends { verse_no: number }>(
  dashakamNo: number,
  verses: T[]
): T[] {
  const order = DASHAKAM_VERSE_ORDER_OVERRIDE[dashakamNo];
  if (!order) return verses;
  const rank = new Map(order.map((v, i) => [v, i]));
  return [...verses].sort(
    (a, b) =>
      (rank.get(a.verse_no) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.verse_no) ?? Number.MAX_SAFE_INTEGER)
  );
}

async function fetchVerses(
  dashakamNo: number,
  scriptLang: string,
  translationLang: string,
  numVerses: number | undefined,
  signal?: AbortSignal
): Promise<MergedVerse[]> {
  // Essential: audio + Sanskrit script. Optional: script language, prasadam.
  const [audio, scriptSa, langTarget, prasTarget] = await Promise.all([
    supabase
      .from("verses_audio")
      .select("verse_no, chant_audio_file, sloka_audio_id, meter")
      .eq("dashakam_no", dashakamNo)
      .order("verse_no")
      .abortSignal(signal!),

    // Sanskrit script (Devanagari text)
    supabase
      .from("language_script")
      .select("verse_no, transliteration_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", "sa")
      .order("verse_no")
      .abortSignal(signal!),

    // Target language transliteration + translation (e.g. "en", "mr", "ta")
    supabase
      .from("language_script")
      .select("verse_no, transliteration_text, translation_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", scriptLang)
      .order("verse_no")
      .abortSignal(signal!),

    // Prasadam in translation language
    supabase
      .from("prasadam")
      .select("verse_no, prasadam_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", translationLang)
      .order("verse_no")
      .abortSignal(signal!),
  ]);

  // Essential rows must be reported clearly.
  if (audio.error) throw new Error(`Verse audio unavailable: ${audio.error.message}`);
  if (scriptSa.error) throw new Error(`Verse text unavailable: ${scriptSa.error.message}`);

  const toMap = (arr: any[] | null) =>
    Object.fromEntries((arr || []).map((r) => [r.verse_no, r]));

  const a = toMap(audio.data);
  const s = toMap(scriptSa.data); // Sanskrit
  let l = toMap(langTarget.data); // Script/transliteration language
  let p = toMap(prasTarget.data);

  // Translation may come from a different language than the script
  let tr = l;
  if (translationLang !== scriptLang) {
    const trRes = await supabase
      .from("language_script")
      .select("verse_no, translation_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", translationLang)
      .order("verse_no")
      .abortSignal(signal!);
    tr = toMap(trRes.data);
  }

  // Fallback to English if target language has no script rows OR
  // any verse is missing translation_text (per-verse fallback)
  const needsEnglishFallback =
    (scriptLang !== "en" || translationLang !== "en") &&
    (Object.keys(l).length === 0 ||
      Object.keys(tr).length === 0 ||
      Object.values(tr).some(
        (r: any) => !r?.translation_text || r.translation_text.trim() === ""
      ));

  let lEn: Record<string, any> = {};
  if (needsEnglishFallback) {
    const langEn = await supabase
      .from("language_script")
      .select("verse_no, transliteration_text, translation_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", "en")
      .order("verse_no")
      .abortSignal(signal!);
    lEn = toMap(langEn.data);
    if (Object.keys(l).length === 0) l = lEn;
    if (Object.keys(tr).length === 0) tr = lEn;
  }

  // Prasadam must follow the preferred translation language; fall back to
  // English only for the individual verses that have no localized text.
  const prasadamMissing =
    Object.keys(p).length === 0 ||
    Object.values(p).some((r: any) => !r?.prasadam_text || r.prasadam_text.trim() === "");
  if (translationLang !== "en" && prasadamMissing) {
    const prasEn = await supabase
      .from("prasadam")
      .select("verse_no, prasadam_text")
      .eq("dashakam_no", dashakamNo)
      .eq("language_code", "en")
      .order("verse_no")
      .abortSignal(signal!);
    const pEn = toMap(prasEn.data);
    p = { ...pEn, ...Object.fromEntries(
      Object.entries(p).filter(([, r]: any) => r?.prasadam_text && r.prasadam_text.trim() !== "")
    ) };
  }


  const max =
    numVerses ||
    Math.max(...Object.keys(a).map(Number), ...Object.keys(s).map(Number), 0);

  const merged: MergedVerse[] = [];
  for (let i = 1; i <= max; i++) {
    const hasNative = !!tr[i]?.translation_text && tr[i].translation_text.trim() !== "";
    const translation = (hasNative ? tr[i].translation_text : lEn[i]?.translation_text) ?? "";
    merged.push({
      verse_no: i,
      chant_audio_file: a[i]?.chant_audio_file ?? "",
      sloka_audio_id: a[i]?.sloka_audio_id ?? null,
      sanskrit_text: s[i]?.transliteration_text ?? "",
      meter: a[i]?.meter ?? "",
      transliteration_text: l[i]?.transliteration_text ?? "",
      translation_text: translation,
      translation_language: hasNative ? translationLang : "en",
      prasadam_text: p[i]?.prasadam_text ?? "",
    });
  }

  return merged;
}

function versesQueryOptions(
  dashakamNo: number,
  scriptLang: string,
  translationLang: string,
  numVerses?: number
) {
  return {
    queryKey: versesKey(dashakamNo, scriptLang, translationLang),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchVerses(dashakamNo, scriptLang, translationLang, numVerses, signal),
    staleTime: VERSE_STALE_TIME,
    gcTime: GC_TIME,
  };
}

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en",
  translationLanguage?: string
): UseDashakamResult {
  const translationLang = translationLanguage || selectedLanguage;

  const listQuery = useQuery({
    ...listQueryOptions(selectedLanguage),
    placeholderData: DASHAKAM_SEED,
  });

  // Metadata (gist/benefits/remarks) follows the translation language.
  const trListQuery = useQuery({
    ...listQueryOptions(translationLang),
    enabled: translationLang !== selectedLanguage,
  });

  let dashakamList = listQuery.data ?? DASHAKAM_SEED;
  if (translationLang !== selectedLanguage && trListQuery.data) {
    const trMap = new Map(trListQuery.data.map((d) => [d.dashakam_no, d]));
    dashakamList = dashakamList.map((d) => {
      const t = trMap.get(d.dashakam_no);
      return t
        ? { ...d, gist: t.gist ?? d.gist, benefits: t.benefits ?? d.benefits, remarks: t.remarks ?? d.remarks }
        : d;
    });
  }

  const numVerses = dashakamList.find((d) => d.dashakam_no === selectedDashakam)?.num_verses;

  const versesQuery = useQuery({
    ...versesQueryOptions(selectedDashakam, selectedLanguage, translationLang, numVerses),
    placeholderData: keepPreviousData,
  });

  // Prefetch only the immediately next Dashakam, once the current one is loaded.
  useEffect(() => {
    if (!versesQuery.isSuccess || versesQuery.isPlaceholderData) return;
    if (saveDataEnabled()) return;

    const idx = dashakamList.findIndex((d) => d.dashakam_no === selectedDashakam);
    const next = idx >= 0 ? dashakamList[idx + 1] : undefined;
    if (!next || !next.is_published) return;

    const id = window.setTimeout(() => {
      queryClient.prefetchQuery(
        versesQueryOptions(next.dashakam_no, selectedLanguage, translationLang, next.num_verses)
      );
    }, 1200);

    return () => window.clearTimeout(id);
  }, [
    versesQuery.isSuccess,
    versesQuery.isPlaceholderData,
    selectedDashakam,
    selectedLanguage,
    translationLang,
    dashakamList,
  ]);

  const verses = versesQuery.isPlaceholderData ? [] : versesQuery.data ?? [];
  const loading = versesQuery.isPending || versesQuery.isPlaceholderData;
  const err = (versesQuery.error ?? listQuery.error) as Error | null;

  return {
    dashakamList,
    verses,
    loading,
    error: err ? err.message || "Failed to load data" : null,
    audioReady: !loading && verses.length > 0 && verses.some((v) => v.chant_audio_file),
  };
}

/** Get dashakam name from cache — also triggers a fetch if the cache is empty */
export function getDashakamName(dashakamNo: number, lang: string = "en"): string {
  const list =
    queryClient.getQueryData<DashakamListItem[]>(listKey(lang)) ??
    queryClient.getQueryData<DashakamListItem[]>(listKey("en"));
  const item = list?.find((d) => d.dashakam_no === dashakamNo);
  if (item?.dashakam_name) return item.dashakam_name;
  prefetchDashakamList(lang).catch(() => {});
  return `Dashakam ${dashakamNo}`;
}

/** Only dashakams whose content is ready to chant/read. */
export function publishedDashakams(list: DashakamListItem[]): DashakamListItem[] {
  return list.filter((d) => d.is_published);
}

/** Prefetch dashakam list — can be called from any page */
export function prefetchDashakamList(lang: string = "en"): Promise<DashakamListItem[]> {
  return queryClient.fetchQuery(listQueryOptions(lang));
}

/** Dashakam names in a specific language — used for pickers/labels only. */
export function useDashakamNames(lang: string = "en"): DashakamListItem[] {
  const q = useQuery({ ...listQueryOptions(lang), placeholderData: DASHAKAM_SEED });
  return q.data ?? DASHAKAM_SEED;
}
