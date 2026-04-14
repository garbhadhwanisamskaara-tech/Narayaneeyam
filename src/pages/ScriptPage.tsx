import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ChevronDown, ChevronUp, Loader2, BookOpen } from "lucide-react";
import { useDashakam, type MergedVerse } from "@/hooks/useDashakam";
import { supabase } from "@/integrations/supabase/client";
import VerseIcons from "@/components/VerseIcons";

const LANGUAGE_OPTIONS = [
  { code: "sa", label: "Sanskrit" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "ml", label: "Malayalam" },
  { code: "te", label: "Telugu" },
  { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" },
  { code: "kn", label: "Kannada" },
];

export default function ScriptPage() {
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [viewMode, setViewMode] = useState<"full" | "para">("full");
  const [selectedLangCode, setSelectedLangCode] = useState("en");
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);

  const { dashakamList, verses, loading } = useDashakam(
    selectedDashakam,
    selectedLangCode === "sa" ? "en" : selectedLangCode
  );

  // Determine which verses to display
  const displayVerses =
    viewMode === "para" && selectedPara
      ? verses.filter((v) => v.verse_no === selectedPara)
      : verses;

  const numVerses =
    dashakamList.find((d) => d.dashakam_no === selectedDashakam)?.num_verses
    ?? 10;

  const dashakamTitle =
    dashakamList.find((d) => d.dashakam_no === selectedDashakam)?.dashakam_name
    ?? `Dashakam ${selectedDashakam}`;

  const getVerseText = (verse: MergedVerse) => {
    if (selectedLangCode === "sa") return verse.sanskrit_text;
    return verse.transliteration_text || verse.sanskrit_text;
  };

  const getMeaning = (verse: MergedVerse) => verse.translation_text || "";

  const handleDownload = () => {
    const text = displayVerses
      .map((v) => `Verse ${v.verse_no}\n${getVerseText(v)}\n\nMeaning:\n${getMeaning(v)}\n`)
      .join("\n---\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashakam-${selectedDashakam}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dropdownList = dashakamList;

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
              {dropdownList.map((d) => (
                <option key={d.dashakam_no} value={d.dashakam_no}>
                  {d.dashakam_no}. {d.dashakam_name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Language</label>
            <select
              value={selectedLangCode}
              onChange={(e) => setSelectedLangCode(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
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
                Verse by Verse
              </button>
            </div>
          </div>

          {viewMode === "para" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-sans">Verse</label>
              <select
                value={selectedPara || ""}
                onChange={(e) => setSelectedPara(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
              >
                <option value="">Select...</option>
                {Array.from({ length: numVerses }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>Verse {n}</option>
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
        {(() => {
          const dk = dashakamList.find((d) => d.dashakam_no === selectedDashakam);
          return (
            <div className="mb-6">
              <div className="rounded-xl bg-gradient-peacock p-5">
                <h2 className="font-display text-xl font-semibold text-primary-foreground">
                  {dashakamTitle}
                </h2>
                <p className="text-gold-light font-sans text-sm">{dashakamTitle}</p>
                {dk?.remarks && (
                  <p className="text-gold-light/80 text-xs font-sans mt-1 italic">Note: {dk.remarks}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowGist(!showGist)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors"
                  >
                    {showGist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showGist ? "Hide Gist" : "View Gist"}
                  </button>
                  {dk?.benefits && (
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
                {showGist && dk?.gist && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                      <p className="text-sm text-foreground font-sans leading-relaxed">{dk.gist}</p>
                    </div>
                  </motion.div>
                )}
                {showBenefit && dk?.benefits && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                      <p className="text-sm text-foreground font-sans leading-relaxed">✨ {dk.benefits}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground font-sans">Loading verses…</span>
          </div>
        )}

        {/* Verses Display */}
        {!loading && (
          <div className="space-y-4">
            {displayVerses.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-sans text-lg">Content coming soon for this dashakam</p>
                <p className="text-muted-foreground/60 font-sans text-sm mt-1">Check back later as we continue adding content.</p>
              </div>
            ) : (
              displayVerses.map((verse, idx) => (
                <motion.div
                  key={verse.verse_no}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="rounded-xl border border-border bg-card p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-sans">
                      Verse {verse.verse_no} · Meter: {verse.meter}
                    </span>
                    <VerseIcons bell={false} prasadam={verse.prasadam_text} />
                  </div>

                  {/* Sanskrit script — always shown */}
                  <p className="font-body text-lg leading-relaxed whitespace-pre-line text-foreground mb-3">
                    {verse.sanskrit_text}
                  </p>

                  {/* Transliteration — shown if language is not Sanskrit and text exists */}
                  {selectedLangCode !== "sa" && verse.transliteration_text && (
                    <div className="border-t border-border pt-3 mb-3">
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">
                        Transliteration ({LANGUAGE_OPTIONS.find((l) => l.code === selectedLangCode)?.label})
                      </p>
                      <p className="font-body text-base leading-relaxed whitespace-pre-line text-foreground/80">
                        {verse.transliteration_text}
                      </p>
                    </div>
                  )}

                  {/* Translation — shown if text exists */}
                  {verse.translation_text && (
                    <div className="border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">
                        Translation ({LANGUAGE_OPTIONS.find((l) => l.code === selectedLangCode)?.label})
                      </p>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                        {verse.translation_text}
                      </p>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
