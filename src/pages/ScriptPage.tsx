import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import {
  sampleDashakams,
  TRANSLITERATION_LANGUAGES,
  TRANSLATION_LANGUAGES,
  verseShouldShowBell,
  getVersePrasadam,
  type TransliterationLanguage,
  type TranslationLanguage,
} from "@/data/narayaneeyam";
import VerseIcons from "@/components/VerseIcons";

export default function ScriptPage() {
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [viewMode, setViewMode] = useState<"full" | "para">("full");
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);

  const dashakam = sampleDashakams.find((d) => d.id === selectedDashakam);
  const verses = dashakam?.verses || [];
  const displayVerses =
    viewMode === "para" && selectedPara
      ? verses.filter((v) => v.paragraph === selectedPara)
      : verses;

  const getVerseText = (verse: typeof verses[0]) => {
    return verse[translitLang] || verse.sanskrit;
  };

  const getMeaning = (verse: typeof verses[0]) => {
    const key = `meaning_${translationLang}` as keyof typeof verse;
    return (verse[key] as string) || verse.meaning_english;
  };

  const handleDownload = () => {
    const text = displayVerses
      .map((v) => `Verse ${v.paragraph}\n${getVerseText(v)}\n\nMeaning:\n${getMeaning(v)}\n`)
      .join("\n---\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashakam-${selectedDashakam}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Script Library</h1>
          <p className="text-muted-foreground font-sans">
            View slokas with separate transliteration and translation language choices
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Transliteration</label>
            <select
              value={translitLang}
              onChange={(e) => setTranslitLang(e.target.value as TransliterationLanguage)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {TRANSLITERATION_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Translation</label>
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value as TranslationLanguage)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {TRANSLATION_LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select
              value={selectedDashakam}
              onChange={(e) => {
                setSelectedDashakam(Number(e.target.value));
                setSelectedPara(null);
                setShowGist(false);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {sampleDashakams.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}. {d.title_english}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">View Mode</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("full")}
                className={`px-3 py-2 text-sm font-sans ${
                  viewMode === "full" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                Full Dashakam
              </button>
              <button
                onClick={() => setViewMode("para")}
                className={`px-3 py-2 text-sm font-sans ${
                  viewMode === "para" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                Para-wise
              </button>
            </div>
          </div>

          {viewMode === "para" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-sans">Paragraph</label>
              <select
                value={selectedPara || ""}
                onChange={(e) => setSelectedPara(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
              >
                <option value="">Select...</option>
                {Array.from({ length: dashakam?.num_verses || 0 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Para {n}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1 justify-end ml-auto">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 text-sm font-sans font-semibold text-primary shadow-gold hover:scale-105 transition-transform"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>

        {/* Dashakam Title + Gist */}
        {dashakam && (
          <div className="mb-6">
            <div className="rounded-xl bg-gradient-peacock p-5">
              <h2 className="font-display text-xl font-semibold text-primary-foreground">
                {dashakam.title_sanskrit}
              </h2>
              <p className="text-gold-light font-sans text-sm">{dashakam.title_english}</p>
              {dashakam.remarks && (
                <p className="text-gold-light/80 text-xs font-sans mt-1 italic">Note: {dashakam.remarks}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setShowGist(!showGist)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors"
                >
                  {showGist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showGist ? "Hide Gist" : "View Gist"}
                </button>
                {dashakam.benefits && (
                  <button
                    onClick={() => setShowBenefit(!showBenefit)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors"
                  >
                    {showBenefit ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showBenefit ? "Hide Benefit" : "View Benefit"}
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {showGist && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                    <p className="text-sm text-foreground font-sans leading-relaxed">{dashakam.gist}</p>
                  </div>
                </motion.div>
              )}
              {showBenefit && dashakam.benefits && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                    <p className="text-sm text-foreground font-sans leading-relaxed">✨ {dashakam.benefits}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Verses Display */}
        <div className="space-y-4">
          {displayVerses.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted-foreground font-sans">
                No verse content available yet for this Dashakam. Admin needs to upload verse data.
              </p>
            </div>
          ) : (
            displayVerses.map((verse, idx) => (
              <motion.div
                key={verse.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-sans">
                    Verse {verse.paragraph} · Meter: {verse.meter}
                  </span>
                  <VerseIcons
                    bell={dashakam ? verseShouldShowBell(dashakam, verse.paragraph) : false}
                    prasadam={dashakam ? getVersePrasadam(dashakam, verse.paragraph) : undefined}
                  />
                </div>
                <p className="font-body text-lg leading-relaxed whitespace-pre-line text-foreground mb-4">
                  {getVerseText(verse)}
                </p>
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation ({translationLang})</p>
                  <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                    {getMeaning(verse)}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
