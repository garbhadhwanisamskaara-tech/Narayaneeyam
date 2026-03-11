import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  getVerseTimestamp,
  getActivePhraseAtTime,
  DEFAULT_SILENCE_GAP_SEC,
  DEFAULT_REPEAT_COUNT,
  calcSilenceDuration,
} from "@/lib/audioTimestamps";
import { Link } from "react-router-dom";
import VerseIcons from "@/components/VerseIcons";

// ─── Sub-components ──────────────────────────────────────────────────────────

function LearnControls({
  plans, activePlan, currentLessonIdx, translitLang, translationLang,
  showMeaning, repeatCount, speed,
  onPlanChange, onLessonChange, onTranslitChange, onTranslationChange,
  onToggleMeaning, onRepeatChange, onSpeedChange,
}: {
  plans: LessonPlan[];
  activePlan: LessonPlan | null;
  currentLessonIdx: number;
  translitLang: TransliterationLanguage;
  translationLang: TranslationLanguage;
  showMeaning: boolean;
  repeatCount: number;
  speed: number;
  onPlanChange: (id: string) => void;
  onLessonChange: (idx: number) => void;
  onTranslitChange: (v: TransliterationLanguage) => void;
  onTranslationChange: (v: TranslationLanguage) => void;
  onToggleMeaning: () => void;
  onRepeatChange: (n: number) => void;
  onSpeedChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-sans">Lesson Plan</label>
        <select value={activePlan?.id || ""} onChange={(e) => onPlanChange(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
          <option value="">Select a plan...</option>
          {plans.map((p) => (<option key={p.id} value={p.id}>Dashakam {p.dashakamStart}-{p.dashakamEnd} ({p.lessons.length} lessons)</option>))}
        </select>
      </div>

      {activePlan && (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground font-sans">Lesson</label>
          <select value={currentLessonIdx} onChange={(e) => onLessonChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
            {activePlan.lessons.map((l, i) => (<option key={l.id} value={i}>Lesson {i + 1}: D{l.dashakam}, P{l.paragraphs.join(",")}{l.completed ? " ✓" : ""}</option>))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-sans">Transliteration</label>
        <select value={translitLang} onChange={(e) => onTranslitChange(e.target.value as TransliterationLanguage)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
          {TRANSLITERATION_LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-sans">Translation</label>
        <select value={translationLang} onChange={(e) => onTranslationChange(e.target.value as TranslationLanguage)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
          {TRANSLATION_LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-sans">Speed</label>
        <select value={speed} onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
          <option value={0.75}>0.75×</option>
          <option value={1}>1×</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground font-sans">Repeats</label>
        <select value={repeatCount} onChange={(e) => onRepeatChange(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
          {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}×</option>))}
        </select>
      </div>

      <div className="flex flex-col gap-1 justify-end">
        <button onClick={onToggleMeaning}
          className={`rounded-lg px-3 py-2 text-sm font-sans transition-colors ${showMeaning ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}>
          {showMeaning ? "Hide Meaning" : "Show Meaning"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [activePlan, setActivePlan] = useState<LessonPlan | null>(null);
  const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [showMeaning, setShowMeaning] = useState(true);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);

  // Audio / playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [highlightPhrase, setHighlightPhrase] = useState(-1); // -1 = whole verse
  const [repeatCount, setRepeatCount] = useState(DEFAULT_REPEAT_COUNT);
  const [speed, setSpeed] = useState(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inGapRef = useRef(false);

  useEffect(() => { setPlans(getLessonPlans()); }, []);

  // Restore last learn position
  useEffect(() => {
    const saved = getProgress();
    if (saved.learnState && plans.length > 0) {
      const plan = plans.find((p) => p.id === saved.learnState!.planId);
      if (plan) {
        setActivePlan(plan);
        setCurrentLessonIdx(saved.learnState!.lessonIdx);
      }
    }
  }, [plans]);

  // Save learn position on changes
  useEffect(() => {
    if (activePlan) {
      saveProgress({ learnState: { planId: activePlan.id, lessonIdx: currentLessonIdx } });
    }
  }, [activePlan, currentLessonIdx]);

  const currentLesson = activePlan?.lessons[currentLessonIdx];
  const dashakam = currentLesson ? sampleDashakams.find((d) => d.id === currentLesson.dashakam) : null;
  const lessonVerses = dashakam?.verses.filter((v) => currentLesson?.paragraphs.includes(v.paragraph)) || [];

  const getVerseText = (verse: typeof lessonVerses[0]) => verse[translitLang] || verse.sanskrit;
  const getMeaning = (verse: typeof lessonVerses[0]) => {
    const key = `meaning_${translationLang}` as keyof typeof verse;
    return (verse[key] as string) || verse.meaning_english;
  };

  // Split verse text into lines/phrases for line-level highlighting
  const getVerseLines = (verse: typeof lessonVerses[0]) => {
    const text = getVerseText(verse);
    return text.split("\n").filter(Boolean);
  };

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current) { clearTimeout(gapTimerRef.current); gapTimerRef.current = null; }
    inGapRef.current = false;
  }, []);

  // Stop everything
  const stopPlayback = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    clearGapTimer();
    setIsPlaying(false);
    setHighlightPhrase(-1);
  }, [clearGapTimer]);

  // Advance: after a phrase/line finishes → insert silence gap → next phrase or next verse
  const advancePhrase = useCallback(() => {
    const verse = lessonVerses[highlightIdx];
    if (!verse) return;

    const vt = dashakam ? getVerseTimestamp(dashakam.id, verse.paragraph) : undefined;
    const phraseCount = vt?.phraseEndTimes.length || getVerseLines(verse).length || 1;
    const nextPhrase = highlightPhrase + 1;

    if (nextPhrase < phraseCount) {
      // Next phrase — no artificial gap, audio already has silence
      setHighlightPhrase(nextPhrase);
    } else {
      // Move to next verse
      if (highlightIdx < lessonVerses.length - 1) {
        setHighlightIdx((prev) => prev + 1);
        setHighlightPhrase(0);
      } else {
        // All done
        stopPlayback();
        updateStreak();
      }
    }
  }, [highlightIdx, highlightPhrase, lessonVerses, dashakam, repeatCount, stopPlayback]);

  // Audio playback effect: play current verse audio, use timeupdate for phrase highlighting
  useEffect(() => {
    if (!isPlaying || lessonVerses.length === 0 || inGapRef.current) return;

    const verse = lessonVerses[highlightIdx];
    if (!verse) return;

    if (verse.audio) {
      const audio = new Audio(verse.audio);
      audioRef.current = audio;
      audio.playbackRate = speed;
      audio.play().catch((e) => console.error("Audio error:", e));

      const vt = dashakam ? getVerseTimestamp(dashakam.id, verse.paragraph) : undefined;

      const onTimeUpdate = () => {
        if (vt && vt.phraseEndTimes.length > 0) {
          const phraseIdx = getActivePhraseAtTime(dashakam!.id, verse.paragraph, audio.currentTime);
          setHighlightPhrase(phraseIdx);
        }
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.onended = () => advancePhrase();

      return () => {
        audio.pause();
        audio.removeEventListener("timeupdate", onTimeUpdate);
        audio.onended = null;
      };
    } else {
      // Fallback: simulate 4s per phrase, then advance
      const lines = getVerseLines(verse);
      const phraseCount = lines.length || 1;
      if (highlightPhrase < 0) setHighlightPhrase(0);

      const timer = setTimeout(() => {
        advancePhrase();
      }, 4000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, highlightIdx, highlightPhrase, lessonVerses.length]);

  // Cleanup
  useEffect(() => { return () => { stopPlayback(); }; }, [stopPlayback]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      setHighlightPhrase(0);
      setIsPlaying(true);
    }
  };

  // ─── Empty state ─────────────────────────────────────────────────────────────

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

  // ─── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Learn with Me</h1>
          <p className="text-muted-foreground font-sans">Guided learning with meaning, practice loops, and silence gaps for repetition</p>
        </div>

        <LearnControls
          plans={plans} activePlan={activePlan} currentLessonIdx={currentLessonIdx}
          translitLang={translitLang} translationLang={translationLang}
          showMeaning={showMeaning} repeatCount={repeatCount}
          speed={speed}
          onPlanChange={(id) => { const plan = plans.find((p) => p.id === id); setActivePlan(plan || null); setCurrentLessonIdx(0); stopPlayback(); setHighlightIdx(0); }}
          onLessonChange={(idx) => { setCurrentLessonIdx(idx); stopPlayback(); setHighlightIdx(0); }}
          onTranslitChange={setTranslitLang} onTranslationChange={setTranslationLang}
          onToggleMeaning={() => setShowMeaning(!showMeaning)}
          onRepeatChange={setRepeatCount}
          onSpeedChange={setSpeed}
        />

        {/* Learning Content */}
        {currentLesson && dashakam ? (
          <>
            {/* Dashakam header */}
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

            {/* Silence gap indicator removed — learn audio has built-in silence */}

            {/* Verses */}
            <div className="space-y-4 mb-24">
              {lessonVerses.length === 0 ? (
                <div className="rounded-xl bg-card border border-border p-8 text-center">
                  <p className="text-muted-foreground font-sans">No verse data for this lesson yet. Admin needs to upload content.</p>
                </div>
              ) : (
                lessonVerses.map((verse, idx) => {
                  const lines = getVerseLines(verse);
                  const isActiveVerse = idx === highlightIdx && isPlaying;

                  return (
                    <motion.div key={verse.id}
                      className={`rounded-xl border p-5 transition-all duration-500 ${isActiveVerse ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground font-sans">Verse {verse.paragraph} · {verse.meter}</span>
                        <VerseIcons bell={verseShouldShowBell(dashakam, verse.paragraph)} prasadam={getVersePrasadam(dashakam, verse.paragraph)} />
                      </div>

                      {/* Line-by-line rendering with phrase highlighting */}
                      <div className="font-body text-lg leading-relaxed mb-3 space-y-1">
                        {lines.map((line, lineIdx) => (
                          <p key={lineIdx}
                            className={`whitespace-pre-line transition-all duration-300 ${
                              isActiveVerse && lineIdx === highlightPhrase
                                ? "text-primary font-semibold scale-[1.01] origin-left"
                                : isActiveVerse && lineIdx < highlightPhrase
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}>
                            {line}
                          </p>
                        ))}
                      </div>

                      {showMeaning && (
                        <div className="border-t border-border pt-3">
                          <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation ({translationLang})</p>
                          <p className="text-sm text-muted-foreground font-sans leading-relaxed">{getMeaning(verse)}</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Player */}
            <div className="fixed bottom-0 left-0 right-0 bg-gradient-peacock p-4 shadow-peacock">
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => { stopPlayback(); setHighlightIdx(0); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><RotateCcw className="h-5 w-5" /></button>
                <button onClick={handlePlayPause} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110">
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
                </button>
              </div>
              <p className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">
                Verse {highlightIdx + 1}/{lessonVerses.length}
                {isPlaying && highlightPhrase >= 0 && ` · Line ${highlightPhrase + 1}`}
                {` · ${repeatCount}× repeats (${silenceGapSec}s gaps)`}
              </p>
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
