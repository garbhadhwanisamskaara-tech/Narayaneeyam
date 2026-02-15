import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import {
  sampleDashakams,
  TRANSLITERATION_LANGUAGES,
  TRANSLATION_LANGUAGES,
  verseShouldShowBell,
  getVersePrasadam,
  type TransliterationLanguage,
  type TranslationLanguage,
} from "@/data/narayaneeyam";
import { getProgress, saveProgress, updateStreak } from "@/lib/progress";
import VerseIcons from "@/components/VerseIcons";

export default function ChantPage() {
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [showMeaning, setShowMeaning] = useState(false);
  const [showGist, setShowGist] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);

  const dashakam = sampleDashakams.find((d) => d.id === selectedDashakam);
  const verses = dashakam?.verses || [];
  const displayVerses = selectedPara
    ? verses.filter((v) => v.paragraph === selectedPara)
    : verses;

  useEffect(() => {
    const progress = getProgress();
    setSelectedDashakam(progress.lastDashakam || 1);
  }, []);

  useEffect(() => {
    saveProgress({ lastDashakam: selectedDashakam, lastPage: "/chant" });
  }, [selectedDashakam]);

  useEffect(() => {
    if (!isPlaying || displayVerses.length === 0) return;
    const interval = setInterval(() => {
      setHighlightedVerse((prev) => {
        if (prev >= displayVerses.length - 1) {
          setIsPlaying(false);
          updateStreak();
          return 0;
        }
        return prev + 1;
      });
    }, 4000 / speed);
    return () => clearInterval(interval);
  }, [isPlaying, displayVerses.length, speed]);

  const getVerseText = (verse: typeof verses[0]) => verse[translitLang] || verse.sanskrit;
  const getMeaning = (verse: typeof verses[0]) => {
    const key = `meaning_${translationLang}` as keyof typeof verse;
    return (verse[key] as string) || verse.meaning_english;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Chant with Me</h1>
          <p className="text-muted-foreground font-sans">Follow along with synchronized text highlighting</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select value={selectedDashakam} onChange={(e) => { setSelectedDashakam(Number(e.target.value)); setSelectedPara(null); setHighlightedVerse(0); setShowGist(false); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {sampleDashakams.map((d) => (<option key={d.id} value={d.id}>{d.id}. {d.title_english}</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Paragraph</label>
            <select value={selectedPara || "all"} onChange={(e) => setSelectedPara(e.target.value === "all" ? null : Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value="all">All</option>
              {Array.from({ length: dashakam?.num_verses || 0 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>Para {n}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Transliteration</label>
            <select value={translitLang} onChange={(e) => setTranslitLang(e.target.value as TransliterationLanguage)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {TRANSLITERATION_LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Translation</label>
            <select value={translationLang} onChange={(e) => setTranslationLang(e.target.value as TranslationLanguage)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {TRANSLATION_LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Speed</label>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Loop</label>
            <select value={loopCount} onChange={(e) => setLoopCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {[1, 2, 3, 5, 10].map((n) => (<option key={n} value={n}>{n}×</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1 justify-end">
            <button onClick={() => setShowMeaning(!showMeaning)}
              className={`rounded-lg px-3 py-2 text-sm font-sans transition-colors ${showMeaning ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
              {showMeaning ? "Hide Meaning" : "Show Meaning"}
            </button>
          </div>
        </div>

        {/* Dashakam Info + Gist */}
        {dashakam && (
          <div className="mb-6">
            <div className="rounded-xl bg-gradient-peacock p-5">
              <h2 className="font-display text-xl font-semibold text-primary-foreground mb-1">{dashakam.title_sanskrit}</h2>
              <p className="text-gold-light font-sans text-sm mb-1">{dashakam.title_english}</p>
              {dashakam.benefits && <p className="text-primary-foreground/70 text-xs font-sans">✨ {dashakam.benefits}</p>}
              <button onClick={() => setShowGist(!showGist)}
                className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors">
                {showGist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {showGist ? "Hide Gist" : "View Gist"}
              </button>
            </div>
            <AnimatePresence>
              {showGist && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                    <p className="text-sm text-foreground font-sans leading-relaxed">{dashakam.gist}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Verses */}
        <div className="space-y-4 mb-8">
          {displayVerses.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted-foreground font-sans">No verses available for this Dashakam yet. Admin needs to upload content.</p>
            </div>
          ) : (
            displayVerses.map((verse, idx) => (
              <motion.div key={verse.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                className={`rounded-xl border p-5 transition-all duration-500 ${idx === highlightedVerse && isPlaying ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-sans">Verse {verse.paragraph} · {verse.meter}</span>
                  <div className="flex items-center gap-2">
                    <VerseIcons bell={dashakam ? verseShouldShowBell(dashakam, verse.paragraph) : false} prasadam={dashakam ? getVersePrasadam(dashakam, verse.paragraph) : undefined} />
                    <button className="text-muted-foreground hover:text-secondary transition-colors"><Bookmark className="h-4 w-4" /></button>
                  </div>
                </div>
                <p className={`font-body text-lg leading-relaxed whitespace-pre-line transition-colors ${idx === highlightedVerse && isPlaying ? "text-primary font-semibold" : "text-foreground"}`}>
                  {getVerseText(verse)}
                </p>
                {showMeaning && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation ({translationLang})</p>
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">{getMeaning(verse)}</p>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Audio Player Bar */}
        <div className="sticky bottom-0 bg-gradient-peacock rounded-t-xl p-4 shadow-peacock">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setHighlightedVerse(Math.max(0, highlightedVerse - 1))} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipBack className="h-5 w-5" /></button>
            <button onClick={() => setHighlightedVerse(0)} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={() => setIsPlaying(!isPlaying)} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button onClick={() => setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1))} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipForward className="h-5 w-5" /></button>
          </div>
          <p className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">Audio playback is simulated — Admin: upload audio files to enable real playback</p>
        </div>
      </motion.div>
    </div>
  );
}
