import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { useLanguagePrefs } from "@/hooks/useLanguagePrefs";
import { getStorageUrl } from "@/lib/storageUrl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Shloka {
  chant_key: string;
  ritual_chant_name: string;
  transliteration_text: string;
  translation_text: string;
  audio_file: string;
}

type ShlokaCategory = "session_start" | "session_end" | "dashakam";

interface DashakamShloka extends Shloka {
  sloka_audio_id: string;
  dashakam_no: number;
  verse_no: number;
}

/** Shared building block: one card per shloka, with its own audio player. */
function ShlokaCard({
  name,
  transliteration,
  translation,
  audioFile,
}: {
  name: string;
  transliteration: string;
  translation: string;
  audioFile: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
      <h3 className="text-base font-semibold text-foreground font-display">{name}</h3>
      {transliteration && (
        <p className="text-sm text-foreground font-sans whitespace-pre-line">{transliteration}</p>
      )}
      <p className="text-sm text-muted-foreground font-sans whitespace-pre-line">{translation}</p>
      <audio controls preload="none" src={getStorageUrl(audioFile)} className="w-full" />
    </div>
  );
}

/** Fetch ritual chants for a trigger point, resolving script & translation languages with English fallback. */
async function fetchRitualChants(
  triggerPoint: string,
  scriptLang: string,
  translationLang: string,
): Promise<Shloka[]> {
  const { data, error } = await (supabase as any)
    .from("ritual_chants")
    .select(`
      chant_key, display_order, chant_audio_file,
      ritual_chant_scripts!left (language_code, ritual_chant_name, transliteration_text, translation_text)
    `)
    .eq("trigger_point", triggerPoint)
    .order("display_order");

  if (error || !data) return [];

  return data
    .filter((r: any) => !!r.chant_audio_file && r.chant_audio_file.trim() !== "")
    .map((r: any) => {
      const scripts = Array.isArray(r.ritual_chant_scripts) ? r.ritual_chant_scripts : [];
      const fallback = scripts.find((s: any) => s.language_code === "en");
      const scriptChosen = scripts.find((s: any) => s.language_code === scriptLang) || fallback;
      const translationChosen = scripts.find((s: any) => s.language_code === translationLang) || fallback;
      return {
        chant_key: r.chant_key,
        ritual_chant_name: scriptChosen?.ritual_chant_name || fallback?.ritual_chant_name || r.chant_key,
        transliteration_text: scriptChosen?.transliteration_text || "",
        translation_text: translationChosen?.translation_text || "",
        audio_file: r.chant_audio_file,
      } as Shloka;
    });
}

/** Fetch active dashakam-linked shlokas, resolving title/script and translation independently. */
async function fetchDashakamShlokas(
  scriptLang: string,
  translationLang: string,
): Promise<DashakamShloka[]> {
  const { data, error } = await (supabase as any)
    .from("sloka_audio")
    .select(`
      sloka_audio_id, dashakam_no, verse_no, chant_audio_file,
      sloka_scripts!left (language_code, sloka_title, transliteration_text, translation_text)
    `)
    .eq("is_active", true)
    .not("dashakam_no", "is", null)
    .order("dashakam_no", { ascending: true })
    .order("verse_no", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => {
    const scripts = Array.isArray(row.sloka_scripts) ? row.sloka_scripts : [];
    const fallback = scripts.find((script: any) => script.language_code === "en") ?? scripts[0];
    const scriptChosen =
      scripts.find((script: any) => script.language_code === scriptLang) ?? fallback;
    const translationChosen =
      scripts.find((script: any) => script.language_code === translationLang) ?? fallback;

    return {
      sloka_audio_id: row.sloka_audio_id,
      dashakam_no: row.dashakam_no,
      verse_no: row.verse_no ?? 0,
      chant_key: row.sloka_audio_id,
      ritual_chant_name:
        scriptChosen?.sloka_title || fallback?.sloka_title || `Dashakam ${row.dashakam_no}`,
      transliteration_text: scriptChosen?.transliteration_text || "",
      translation_text: translationChosen?.translation_text || "",
      audio_file: row.chant_audio_file || "",
    } as DashakamShloka;
  });
}

export default function ShlokasPage() {
  const [starting, setStarting] = useState<Shloka[]>([]);
  const [ending, setEnding] = useState<Shloka[]>([]);
  const [dashakamShlokas, setDashakamShlokas] = useState<DashakamShloka[]>([]);
  const [category, setCategory] = useState<ShlokaCategory>("session_start");
  const [selectedDashakamShlokaId, setSelectedDashakamShlokaId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const { scriptLang, translationLang } = useLanguagePrefs();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [startRows, endRows, dashakamRows] = await Promise.all([
        fetchRitualChants("session_start", scriptLang, translationLang),
        fetchRitualChants("session_end", scriptLang, translationLang),
        fetchDashakamShlokas(scriptLang, translationLang),
      ]);
      if (cancelled) return;
      setStarting(startRows);
      setEnding(endRows);
      setDashakamShlokas(dashakamRows);
      setSelectedDashakamShlokaId((current) =>
        dashakamRows.some((row) => row.sloka_audio_id === current)
          ? current
          : dashakamRows[0]?.sloka_audio_id,
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scriptLang, translationLang]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Shlokas</h1>
        <p className="text-sm text-muted-foreground mb-6 font-sans">Loading…</p>
      </div>
    );
  }

  const selectedRows = category === "session_start" ? starting : ending;
  const selectedDashakamShloka = dashakamShlokas.find(
    (row) => row.sloka_audio_id === selectedDashakamShlokaId,
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <SEO
        path="/shlokas"
        title="Shlokas — Sriman Narayaneeyam"
       description="Session and dashakam-wise prayers for your chanting practice, in script and audio."
      />
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Shlokas</h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Prayers for your chanting practice, in script and audio.
      </p>

      <Select value={category} onValueChange={(value) => setCategory(value as ShlokaCategory)}>
        <SelectTrigger aria-label="Shloka category" className="mb-6 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="session_start">Start of Session</SelectItem>
          <SelectItem value="session_end">End of Session</SelectItem>
          <SelectItem value="dashakam">Dashakam-wise Slokas</SelectItem>
        </SelectContent>
      </Select>

      {category !== "dashakam" && selectedRows.length > 0 && (
        <div className="space-y-3">
          {selectedRows.map((shloka) => (
            <ShlokaCard
              key={shloka.chant_key}
              name={shloka.ritual_chant_name}
              transliteration={shloka.transliteration_text}
              translation={shloka.translation_text}
              audioFile={shloka.audio_file}
            />
          ))}
        </div>
      )}

      {category !== "dashakam" && selectedRows.length === 0 && (
        <p className="text-sm text-muted-foreground font-sans text-center py-8">
          No shlokas available yet
        </p>
      )}

      {category === "dashakam" && dashakamShlokas.length === 0 && (
        <p className="text-sm text-muted-foreground font-sans text-center py-8">
          No dashakam-wise slokas available yet
        </p>
      )}

      {category === "dashakam" && dashakamShlokas.length > 0 && (
        <div className="space-y-4">
          <Select value={selectedDashakamShlokaId} onValueChange={setSelectedDashakamShlokaId}>
            <SelectTrigger aria-label="Dashakam-wise shloka" className="w-full">
              <SelectValue placeholder="Choose a dashakam" />
            </SelectTrigger>
            <SelectContent>
              {dashakamShlokas.map((shloka) => (
                <SelectItem key={shloka.sloka_audio_id} value={shloka.sloka_audio_id}>
                  {shloka.ritual_chant_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedDashakamShloka && (
            <ShlokaCard
              name={selectedDashakamShloka.ritual_chant_name}
              transliteration={selectedDashakamShloka.transliteration_text}
              translation={selectedDashakamShloka.translation_text}
              audioFile={selectedDashakamShloka.audio_file}
            />
          )}
        </div>
      )}
    </div>
  );
}
