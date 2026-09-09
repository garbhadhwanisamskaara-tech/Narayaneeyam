import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { useLanguagePrefs } from "@/hooks/useLanguagePrefs";
import { getStorageUrl } from "@/lib/storageUrl";

interface Shloka {
  chant_key: string;
  ritual_chant_name: string;
  transliteration_text: string;
  translation_text: string;
  audio_file: string;
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

export default function ShlokasPage() {
  const [starting, setStarting] = useState<Shloka[]>([]);
  const [ending, setEnding] = useState<Shloka[]>([]);
  const [loading, setLoading] = useState(true);
  const { scriptLang, translationLang } = useLanguagePrefs();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [startRows, endRows] = await Promise.all([
        fetchRitualChants("session_start", scriptLang, translationLang),
        fetchRitualChants("session_end", scriptLang, translationLang),
      ]);
      if (cancelled) return;
      setStarting(startRows);
      setEnding(endRows);
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

  const renderSection = (title: string, rows: Shloka[]) =>
    rows.length === 0 ? null : (
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">{title}</h2>
        <div className="space-y-3">
          {rows.map((s) => (
            <ShlokaCard
              key={s.chant_key}
              name={s.ritual_chant_name}
              transliteration={s.transliteration_text}
              translation={s.translation_text}
              audioFile={s.audio_file}
            />
          ))}
        </div>
      </section>
    );

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <SEO
        path="/shlokas"
        title="Shlokas — Sriman Narayaneeyam"
        description="Opening and closing prayers for your chanting practice, in script and audio."
      />
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Shlokas</h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Opening and closing prayers for your chanting practice, in script and audio.
      </p>

      {renderSection("Starting Sloka", starting)}
      {renderSection("Ending Sloka", ending)}

      {starting.length === 0 && ending.length === 0 && (
        <p className="text-sm text-muted-foreground font-sans text-center py-8">
          No shlokas available yet
        </p>
      )}
    </div>
  );
}
