import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Bookmark, ChevronDown } from "lucide-react";
import { sampleDashakams, LANGUAGES, type Language } from "@/data/narayaneeyam";
import { getProgress, saveProgress, updateStreak } from "@/lib/progress";

export default function ChantPage() {
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>("sanskrit");
  const [showMeaning, setShowMeaning] = useState(false);
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
    setLanguage((progress.preferredLanguage as Language) || "sanskrit");
  }, []);

  useEffect(() => {
    saveProgress({ lastDashakam: selectedDashakam, lastPage: "/chant" });
  }, [selectedDashakam]);

  // Simulate audio playback highlighting
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

  const getVerseText = (verse: typeof verses[0], lang: Language) => {
    return verse[lang] || verse.sanskrit;
  };

  const getMeaning = (verse: typeof verses[0], lang: Language) => {
    const key = `meaning_${lang}` as keyof typeof verse;
    return (verse[key] as string) || verse.meaning_english;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Chant with Me</h1>
          <p className="text-muted-foreground font-sans">
            Follow along with synchronized text highlighting
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          {/* Dashakam Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select
              value={selectedDashakam}
              onChange={(e) => {
                setSelectedDashakam(Number(e.target.value));
                setSelectedPara(null);
                setHighlightedVerse(0);
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

          {/* Paragraph Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Paragraph</label>
            <select
              value={selectedPara || "all"}
              onChange={(e) =>
                setSelectedPara(e.target.value === "all" ? null : Number(e.target.value))
              }
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              <option value="all">All</option>
              {verses.map((v) => (
                <option key={v.paragraph} value={v.paragraph}>
                  Para {v.paragraph}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Speed */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Speed</label>
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              <option value={0.5}>0.5×</option>
              <option value={0.75}>0.75×</option>
              <option value={1}>1× Normal</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
            </select>
          </div>

          {/* Loop */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Loop</label>
            <select
              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </div>

          {/* Meaning toggle */}
          <div className="flex flex-col gap-1 justify-end">
            <button
              onClick={() => setShowMeaning(!showMeaning)}
              className={`rounded-lg px-3 py-2 text-sm font-sans transition-colors ${
                showMeaning
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-foreground hover:bg-muted"
              }`}
            >
              {showMeaning ? "Hide Meaning" : "Show Meaning"}
            </button>
          </div>
        </div>

        {/* Dashakam Info */}
        {dashakam && (
          <div className="mb-6 rounded-xl bg-gradient-peacock p-5">
            <h2 className="font-display text-xl font-semibold text-primary-foreground mb-1">
              {dashakam.title_sanskrit}
            </h2>
            <p className="text-gold-light font-sans text-sm mb-2">{dashakam.title_english}</p>
            {dashakam.benefits && (
              <p className="text-primary-foreground/80 text-sm font-sans">{dashakam.benefits}</p>
            )}
            {dashakam.prasadam && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-foreground/10 px-3 py-1.5">
                <span className="text-sm text-gold-light font-sans">🪷 Prasadam: {dashakam.prasadam}</span>
              </div>
            )}
          </div>
        )}

        {/* Verses */}
        <div className="space-y-4 mb-8">
          {displayVerses.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted-foreground font-sans">
                No verses available for this Dashakam yet. Admin needs to upload content.
              </p>
            </div>
          ) : (
            displayVerses.map((verse, idx) => (
              <motion.div
                key={verse.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-xl border p-5 transition-all duration-500 ${
                  idx === highlightedVerse && isPlaying
                    ? "border-secondary bg-secondary/10 shadow-gold"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-sans">
                    Verse {verse.paragraph} · {verse.meter}
                  </span>
                  <div className="flex items-center gap-2">
                    {verse.bell && (
                      <span className="text-sm" title="Ring bell here">🔔</span>
                    )}
                    {verse.prasadam && (
                      <span className="text-sm" title={verse.prasadam}>🪷</span>
                    )}
                    <button className="text-muted-foreground hover:text-secondary transition-colors">
                      <Bookmark className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p
                  className={`font-body text-lg leading-relaxed whitespace-pre-line transition-colors ${
                    idx === highlightedVerse && isPlaying
                      ? "text-primary font-semibold"
                      : "text-foreground"
                  }`}
                >
                  {getVerseText(verse, language)}
                </p>

                {showMeaning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 border-t border-border pt-3"
                  >
                    <p className="text-sm text-muted-foreground font-sans leading-relaxed">
                      {getMeaning(verse, language)}
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Audio Player Bar */}
        <div className="sticky bottom-0 bg-gradient-peacock rounded-t-xl p-4 shadow-peacock">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setHighlightedVerse(Math.max(0, highlightedVerse - 1))}
              className="text-primary-foreground/70 hover:text-primary-foreground p-2"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setHighlightedVerse(Math.max(0, highlightedVerse - 1));
              }}
              className="text-primary-foreground/70 hover:text-primary-foreground p-2"
              title="Rewind 10s"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110"
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button
              onClick={() =>
                setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1))
              }
              className="text-primary-foreground/70 hover:text-primary-foreground p-2"
              title="Forward 10s"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              onClick={() =>
                setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1))
              }
              className="text-primary-foreground/70 hover:text-primary-foreground p-2"
            >
              <SkipForward className="h-5 w-5" />
            </button>
          </div>
          <p className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">
            Audio playback is simulated — Admin: upload audio files to enable real playback
          </p>
        </div>
      </motion.div>
    </div>
  );
}
