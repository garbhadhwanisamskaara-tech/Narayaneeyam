import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureAppError, trackSpan } from "@/monitoring/sentry";
import { sampleDashakams, type Dashakam, type Verse } from "@/data/narayaneeyam";

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
  /** The static fallback dashakam (always available) */
  staticDashakam: Dashakam | undefined;
}

export function useDashakam(
  selectedDashakam: number,
  selectedLanguage: string = "en"
): UseDashakamResult {
  const [dashakamList, setDashakamList] = useState<DashakamListItem[]>([]);
  const [verses, setVerses] = useState<MergedVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const staticDashakam = sampleDashakams.find((d) => d.id === selectedDashakam);

  // Load dashakam list once
  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from("dashakams")
        .select("dashakam_no, dashakam_name, num_verses, remarks")
        .eq("language_code", "en")
        .eq("is_published", true)
        .order("dashakam_no");

      if (err) {
        console.error("Failed to load dashakam list:", err.message);
        // Fallback to static list
        setDashakamList(
          sampleDashakams.map((d) => ({
            dashakam_no: d.id,
            dashakam_name: d.title_english,
            num_verses: d.num_verses,
            remarks: d.remarks ?? null,
          }))
        );
      } else if (data && data.length > 0) {
        setDashakamList(data as DashakamListItem[]);
      } else {
        // Empty DB — use static
        setDashakamList(
          sampleDashakams.map((d) => ({
            dashakam_no: d.id,
            dashakam_name: d.title_english,
            num_verses: d.num_verses,
            remarks: d.remarks ?? null,
          }))
        );
      }
    })();
  }, []);

  // Load verse data when dashakam or language changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [audioRes, scriptRes, langRes, prasRes] = await trackSpan(
          "loadDashakam",
          "db.query",
          () => Promise.all([
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
          { dashakam_no: selectedDashakam }
        );

        if (cancelled) return;

        // Check if we have any DB data at all
        const hasDbData =
          (audioRes.data && audioRes.data.length > 0) ||
          (scriptRes.data && scriptRes.data.length > 0);

        if (!hasDbData && staticDashakam) {
          // Fall back to static data — convert to MergedVerse shape
          const staticVerses: MergedVerse[] = staticDashakam.verses.map((v) => ({
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
          setVerses(staticVerses);
          setLoading(false);
          return;
        }

        // Build lookup maps
        const audioMap: Record<number, any> = {};
        (audioRes.data ?? []).forEach((r: any) => { audioMap[r.verse_no] = r; });

        const scriptMap: Record<number, any> = {};
        (scriptRes.data ?? []).forEach((r: any) => { scriptMap[r.verse_no] = r; });

        const langMap: Record<number, any> = {};
        (langRes.data ?? []).forEach((r: any) => { langMap[r.verse_no] = r; });

        const prasMap: Record<number, any> = {};
        (prasRes.data ?? []).forEach((r: any) => { prasMap[r.verse_no] = r; });

        // Determine verse count from DB or static
        const numVerses = staticDashakam?.num_verses ?? Math.max(
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
          // If DB row is empty for this verse, try static fallback
          const staticVerse = staticDashakam?.verses.find((sv) => sv.paragraph === v);

          merged.push({
            verse_no: v,
            sanskrit_text: s?.transliteration_text ?? staticVerse?.sanskrit ?? "",
            meter: "",
            has_bell: false,
            chant_audio_file: a?.chant_audio_file ?? staticVerse?.audio ?? "",
            learn_audio_file: a?.learn_audio_file ?? "",
            sloka_audio_id: a?.sloka_audio_id ?? null,
            transliteration_text: l?.transliteration_text ?? staticVerse?.english ?? "",
            translation_text: l?.translation_text ?? staticVerse?.meaning_english ?? "",
            prasadam_text: p?.prasadam_text ?? staticVerse?.prasadam ?? "",
          });
        }

        setVerses(merged);
      } catch (err: any) {
        captureAppError(err, { component: "dashakam", dashakam_no: selectedDashakam });
        if (!cancelled) {
          setError(err.message ?? "Failed to load dashakam data");
          // On error, fall back to static
          if (staticDashakam) {
            setVerses(
              staticDashakam.verses.map((v) => ({
                verse_no: v.paragraph,
                sanskrit_script: v.sanskrit,
                meter: v.meter,
                has_bell: v.bell ?? false,
                chant_audio_file: v.audio ?? "",
                learn_audio_file: "",
                sloka_id: null,
                transliteration_text: v.english,
                translation_text: v.meaning_english,
                prasadam_text: v.prasadam ?? "",
              }))
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedDashakam, selectedLanguage]);

  return { dashakamList, verses, loading, error, staticDashakam };
}
