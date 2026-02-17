import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import {
  sampleDashakams,
  TRANSLITERATION_LANGUAGES,
  TRANSLATION_LANGUAGES,
  verseShouldShowBell,
  getVersePrasadam,
  type TransliterationLanguage,
  type TranslationLanguage,
} from "@/data/narayaneeyam";
import { getLessonPlans, type LessonPlan } from "@/lib/lessonPlan";
import { getProgress, saveProgress, updateStreak } from "@/lib/progress";
import { Link } from "react-router-dom";
import VerseIcons from "@/components/VerseIcons";

export default function LearnPage() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [activePlan, setActivePlan] = useState<LessonPlan | null>(null);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [showMeaning, setShowMeaning] = useState(true);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [loopCount, setLoopCount] = useState(2);

  useEffect(() => {
    setPlans(getLessonPlans());
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const lesson = activePlan?.lessons[currentLessonIdx];
    if (!lesson) return;
    const dashakam = sampleDashakams.find((d) => d.id === lesson.dashakam);
    const verses = dashakam?.verses.filter((v) => lesson.paragraphs.includes(v.paragraph)) || [];
    if (verses.length === 0) return;

    const interval = setInterval(() => {
      setHighlightIdx((prev) => {
        if (prev >= verses.length - 1) { setIsPlaying(false); updateStreak(); return 0; }
        return prev + 1;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying, activePlan, currentLessonIdx]);

  const currentLesson = activePlan?.lessons[currentLessonIdx];
  const dashakam = currentLesson ? sampleDashakams.find((d) => d.id === currentLesson.dashakam) : null;
  const lessonVerses = dashakam?.verses.filter((v) => currentLesson?.paragraphs.includes(v.paragraph)) || [];

  const getVerseText = (verse: typeof lessonVerses[0]) => verse[translitLang] || verse.sanskrit;
  const getMeaning = (verse: typeof lessonVerses[0]) => {
    const key = `meaning_${translationLang}` as keyof typeof verse;
    return (verse[key] as string) || verse.meaning_english;
  };

  if (plans.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <h1 className="font-display text-3xl font-bold text-foreground mb-4">Learn with Me</h1>
          <p className="text-muted-foreground font-sans mb-8 max-w-md mx-auto">You don't have a lesson plan yet. Create one to start your structured learning journey.</p>
          <Link to="/lesson-plan" className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-6 py-3 font-sans font-semibold text-primary shadow-gold transition-transform hover:scale-105">
            Create Lesson Plan <ChevronRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Learn with Me</h1>
          <p className="text-muted-foreground font-sans">Guided learning with meaning, practice loops, and progress tracking</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Lesson Plan</label>
            <select value={activePlan?.id || ""} onChange={(e) => { const plan = plans.find((p) => p.id === e.target.value); setActivePlan(plan || null); setCurrentLessonIdx(0); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value="">Select a plan...</option>
              {plans.map((p) => (<option key={p.id} value={p.id}>Dashakam {p.dashakamStart}-{p.dashakamEnd} ({p.lessons.length} lessons)</option>))}
            </select>
          </div>

          {activePlan && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-sans">Lesson</label>
              <select value={currentLessonIdx} onChange={(e) => { setCurrentLessonIdx(Number(e.target.value)); setHighlightIdx(0); }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
                {activePlan.lessons.map((l, i) => (<option key={l.id} value={i}>Lesson {i + 1}: Dashakam {l.dashakam}, Para {l.paragraphs.join(",")}{l.completed ? " ✓" : ""}</option>))}
              </select>
            </div>
          )}

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
            <label className="text-xs text-muted-foreground font-sans">Loop</label>
            <select value={loopCount} onChange={(e) => setLoopCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {[1, 2, 3, 5].map((n) => (<option key={n} value={n}>{n}×</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1 justify-end">
            <button onClick={() => setShowMeaning(!showMeaning)}
              className={`rounded-lg px-3 py-2 text-sm font-sans transition-colors ${showMeaning ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
              {showMeaning ? "Hide Meaning" : "Show Meaning"}
            </button>
          </div>
        </div>

        {/* Learning Content */}
        {currentLesson && dashakam ? (
          <>
            <div className="mb-6">
              <div className="rounded-xl bg-gradient-peacock p-5">
                <h2 className="font-display text-xl font-semibold text-primary-foreground">Dashakam {currentLesson.dashakam}: {dashakam.title_english}</h2>
                <p className="text-gold-light font-sans text-sm">Paragraphs: {currentLesson.paragraphs.join(", ")} · Scheduled: {currentLesson.date}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => setShowGist(!showGist)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors">
                    {showGist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showGist ? "Hide Gist" : "View Gist"}
                  </button>
                  {dashakam.benefits && (
                    <button onClick={() => setShowBenefit(!showBenefit)}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors">
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

            <div className="space-y-4 mb-24">
              {lessonVerses.length === 0 ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center">
                  <p className="text-muted-foreground font-sans">No verse data for this lesson yet. Admin needs to upload content.</p>
                </div>
              ) : (
                lessonVerses.map((verse, idx) => (
                  <motion.div key={verse.id}
                    className={`rounded-xl border p-5 transition-all duration-500 ${idx === highlightIdx && isPlaying ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground font-sans">Verse {verse.paragraph} · {verse.meter}</span>
                      <VerseIcons bell={verseShouldShowBell(dashakam, verse.paragraph)} prasadam={getVersePrasadam(dashakam, verse.paragraph)} />
                    </div>
                    <p className={`font-body text-lg leading-relaxed whitespace-pre-line mb-3 ${idx === highlightIdx && isPlaying ? "text-primary font-semibold" : "text-foreground"}`}>
                      {getVerseText(verse)}
                    </p>
                    {showMeaning && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation ({translationLang})</p>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">{getMeaning(verse)}</p>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            {/* Player */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-peacock p-4 shadow-peacock">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => setHighlightIdx(0)} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><RotateCcw className="h-5 w-5" /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110">
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </button>
              </div>
              <p className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">Learning mode: Audio plays with pauses for repetition</p>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-card border border-border p-8 text-center">
            <p className="text-muted-foreground font-sans">Select a lesson plan and lesson to begin.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
