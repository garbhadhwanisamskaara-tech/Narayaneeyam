import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronDown, ChevronUp, Volume2, Square } from "lucide-react";
import { logEvent, logAudioEvent } from "@/services/eventLogger";
import { captureAudioError } from "@/monitoring/sentry";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFavourites } from "@/hooks/useFavourites";
import BookmarkButton from "@/components/BookmarkButton";
import FavouriteButton from "@/components/FavouriteButton";
import RemoveBottomSheet from "@/components/RemoveBottomSheet";
import {
  sampleDashakams,
  TRANSLITERATION_LANGUAGES,
  TRANSLATION_LANGUAGES,
  type TransliterationLanguage,
  type TranslationLanguage,
} from "@/data/narayaneeyam";
import { useDashakam } from "@/hooks/useDashakam";
import { useRitualChants } from "@/hooks/useRitualChants";
import RitualChantOverlay from "@/components/RitualChantOverlay";
import { getProgress, saveProgress } from "@/lib/progress";
import { updateStreakSupabase, markVerseCompleted } from "@/lib/supabaseProgress";
import { getActiveVerseAtTime, getTimestamps } from "@/lib/audioTimestamps";
import VerseIcons from "@/components/VerseIcons";
import { Slider } from "@/components/ui/slider";

type RitualPhase = "idle" | "opening" | "dashakam_end" | "session_end";

export default function ChantPage() {
  const [searchParams] = useSearchParams();
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [showMeaning, setShowMeaning] = useState(false);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoopIteration, setCurrentLoopIteration] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ type: "bookmark" | "favourite"; verseId: string; dashakam: number; verse: number } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark } = useBookmarks();
  const { isFavourited, addFavourite, removeFavourite, undoRemoveFavourite } = useFavourites();

  // Map translitLang/translationLang to a language_code for the hook
  const langCodeMap: Record<string, string> = {
    sanskrit: "sa", english: "en", tamil: "ta", malayalam: "ml",
    telugu: "te", kannada: "kn", hindi: "hi", marathi: "mr",
  };
  const selectedLanguage = langCodeMap[translationLang] || "en";

  // Live data from Supabase with static fallback
  const { dashakamList, verses: dbVerses, loading: dbLoading, staticDashakam } = useDashakam(selectedDashakam, selectedLanguage);

  // Build the dashakam dropdown list — prefer DB list, fallback to static
  const dropdownList = dashakamList.length > 0
    ? dashakamList.map((d) => ({ id: d.dashakam_no, title: d.dashakam_name }))
    : sampleDashakams.map((d) => ({ id: d.id, title: d.title_english }));

  // Use static dashakam for gist/benefits/title (always available)
  const dashakam = staticDashakam;

  // Convert dbVerses to display format compatible with existing rendering
  const allVerses = dbVerses.map((mv) => ({
    id: `${selectedDashakam}-${mv.verse_no}`,
    dashakam: selectedDashakam,
    paragraph: mv.verse_no,
    sanskrit: mv.sanskrit_script,
    english: mv.transliteration_text,
    meaning_english: mv.translation_text,
    meter: mv.meter,
    audio: mv.chant_audio_file || undefined,
    bell: mv.has_bell,
    prasadam: mv.prasadam_text || undefined,
    // Language-specific fields for transliteration lookup
    tamil: "", malayalam: "", telugu: "", kannada: "", hindi: "", marathi: "",
    meaning_tamil: "", meaning_malayalam: "", meaning_telugu: "",
    meaning_kannada: "", meaning_hindi: "", meaning_marathi: "",
  }));

  const displayVerses = selectedPara
    ? allVerses.filter((v) => v.paragraph === selectedPara)
    : allVerses;

  // Restore last position or use query param
  useEffect(() => {
    const qd = searchParams.get("dashakam");
    if (qd) {
      const num = parseInt(qd, 10);
      if (num >= 1 && num <= 100) {
        setSelectedDashakam(num);
        return;
      }
    }
    const progress = getProgress();
    if (progress.chantState) {
      setSelectedDashakam(progress.chantState.dashakam);
      setSelectedPara(progress.chantState.para);
      setHighlightedVerse(progress.chantState.verse);
    } else {
      setSelectedDashakam(progress.lastDashakam || 1);
    }
  }, []);

  // Save position on changes
  useEffect(() => {
    saveProgress({
      lastDashakam: selectedDashakam,
      lastPage: "/chant",
      chantState: { dashakam: selectedDashakam, para: selectedPara, verse: highlightedVerse },
    });
  }, [selectedDashakam, selectedPara, highlightedVerse]);

  const advanceToNextVerse = useCallback(() => {
    if (highlightedVerse >= displayVerses.length - 1) {
      const nextLoop = currentLoopIteration + 1;
      if (nextLoop < loopCount) {
        setCurrentLoopIteration(nextLoop);
        setHighlightedVerse(0);
        setVerseProgress(0);
      } else {
        setIsPlaying(false);
        updateStreakSupabase();
        setHighlightedVerse(0);
        setVerseProgress(0);
        setCurrentLoopIteration(0);
      }
    } else {
      setVerseProgress(0);
      gapTimerRef.current = setTimeout(() => {
        setHighlightedVerse((prev) => prev + 1);
      }, 1500);
    }
  }, [highlightedVerse, displayVerses.length, loopCount, currentLoopIteration]);

  // Real audio playback
  useEffect(() => {
    if (!isPlaying || displayVerses.length === 0) return;
    
    const currentVerse = displayVerses[highlightedVerse];

    if (pausedRef.current && audioRef.current && !audioRef.current.ended) {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch((err) => console.error("Audio play error:", err));
      pausedRef.current = false;
      logAudioEvent("audio_play", selectedDashakam, currentVerse?.paragraph || 0, "resume");
      
      const audio = audioRef.current;
      const updateProgress = () => {
        if (audio.duration) setVerseProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => {
        logAudioEvent("audio_complete", selectedDashakam, currentVerse?.paragraph || 0, currentVerse?.audio || "");
        advanceToNextVerse();
      };
      return () => { audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    }
    
    if (currentVerse?.audio) {
      const loadStart = performance.now();
      const audio = new Audio(currentVerse.audio);
      audioRef.current = audio;
      audio.playbackRate = speed;
      pausedRef.current = false;

      audio.addEventListener("canplaythrough", () => {
        const loadTime = Math.round(performance.now() - loadStart);
        const eventType = loadTime > 1500 ? "audio_load_slow" : "audio_load";
        logAudioEvent(eventType, selectedDashakam, currentVerse.paragraph, currentVerse.audio!, { load_time_ms: loadTime });
      }, { once: true });

      audio.addEventListener("error", () => {
        const errMsg = audio.error?.message || "Unknown audio error";
        logAudioEvent("audio_error", selectedDashakam, currentVerse.paragraph, currentVerse.audio!, { error_message: errMsg });
        captureAudioError(new Error(errMsg), { dashakam: selectedDashakam, verse: currentVerse.paragraph, audio_file: currentVerse.audio });
      });

      audio.play().catch((err) => {
        console.error("Audio play error:", err);
        logAudioEvent("audio_error", selectedDashakam, currentVerse.paragraph, currentVerse.audio!, { error_message: String(err) });
      });
      logAudioEvent("audio_play", selectedDashakam, currentVerse.paragraph, currentVerse.audio!);
      
      const updateProgress = () => {
        if (audio.duration) setVerseProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => {
        logAudioEvent("audio_complete", selectedDashakam, currentVerse.paragraph, currentVerse.audio!);
        advanceToNextVerse();
      };
      return () => { audio.pause(); audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    } else {
      const interval = setInterval(() => {
        setVerseProgress((prev) => {
          if (prev >= 100) {
            advanceToNextVerse();
            return 0;
          }
          return prev + (speed * 2.5);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, highlightedVerse, displayVerses.length, speed, advanceToNextVerse]);

  // Cleanup gap timer
  useEffect(() => {
    return () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current); };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        pausedRef.current = true;
      }
      logAudioEvent("audio_pause", selectedDashakam, displayVerses[highlightedVerse]?.paragraph || 0, "");
      setIsPlaying(false);
    } else {
      logEvent("chant_started", { dashakam: selectedDashakam });
      setIsPlaying(true);
    }
  };

  const handleSeekVerse = (value: number[]) => {
    const seekTo = value[0];
    setVerseProgress(seekTo);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (seekTo / 100) * audioRef.current.duration;
    }
  };

  const getVerseText = (verse: typeof allVerses[0]) => {
    if (translitLang === "sanskrit") return verse.sanskrit;
    if (translitLang === "english") return verse.english;
    // For other transliteration languages, the DB content is loaded via selectedLanguage
    return verse.english || verse.sanskrit;
  };

  const getMeaning = (verse: typeof allVerses[0]) => verse.meaning_english;

  return (
    <div className="container mx-auto px-4 py-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Chant with Me</h1>
          <p className="text-muted-foreground font-sans">Follow along with synchronized text highlighting</p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select value={selectedDashakam} onChange={(e) => { setSelectedDashakam(Number(e.target.value)); setSelectedPara(null); setHighlightedVerse(0); setShowGist(false); setVerseProgress(0); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {dropdownList.map((d) => (<option key={d.id} value={d.id}>{d.id}. {d.title}</option>))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Paragraph</label>
            <select value={selectedPara || "all"} onChange={(e) => setSelectedPara(e.target.value === "all" ? null : Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value="all">All</option>
              {Array.from({ length: allVerses.length || 0 }, (_, i) => i + 1).map((n) => (
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
            <select value={speed} onChange={(e) => { setSpeed(Number(e.target.value)); if (audioRef.current) audioRef.current.playbackRate = Number(e.target.value); }}
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
        )}

        {/* Loading state */}
        {dbLoading && (
          <div className="rounded-xl bg-card border border-border p-8 text-center mb-8">
            <p className="text-muted-foreground font-sans">Loading verses…</p>
          </div>
        )}

        {/* Verses */}
        {!dbLoading && (
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
                    <div className="flex items-center gap-1">
                      <VerseIcons bell={verse.bell} prasadam={verse.prasadam} />
                      <BookmarkButton
                        active={isBookmarked(verse.id)}
                        onClick={() => {
                          if (isBookmarked(verse.id)) {
                            setRemoveTarget({ type: "bookmark", verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph });
                          } else {
                            addBookmark({ verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph, mode: "chant" });
                          }
                        }}
                      />
                      <FavouriteButton
                        active={isFavourited(verse.id)}
                        onClick={() => {
                          if (isFavourited(verse.id)) {
                            setRemoveTarget({ type: "favourite", verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph });
                          } else {
                            addFavourite({ verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph, sanskrit: verse.sanskrit || verse.english });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <p className={`font-body text-lg leading-relaxed whitespace-pre-line transition-colors ${idx === highlightedVerse && isPlaying ? "text-primary font-semibold" : "text-foreground"}`}>
                    {getVerseText(verse)}
                  </p>
                  {/* Verse seek bar */}
                  {idx === highlightedVerse && verse.audio && (
                    <div className="mt-3">
                      <Slider
                        value={[verseProgress]}
                        onValueChange={handleSeekVerse}
                        max={100}
                        step={0.5}
                        className="w-full"
                      />
                    </div>
                  )}
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
        )}

        {/* Audio Player Bar */}
        <div className="sticky bottom-0 bg-gradient-peacock rounded-t-xl p-4 shadow-peacock">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; setVerseProgress(0); setHighlightedVerse(Math.max(0, highlightedVerse - 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipBack className="h-5 w-5" /></button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; setVerseProgress(0); setHighlightedVerse(0); setCurrentLoopIteration(0); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={handlePlayPause} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; setVerseProgress(0); setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipForward className="h-5 w-5" /></button>
          </div>
          <div className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">
            Verse {highlightedVerse + 1} of {displayVerses.length}
            {loopCount > 1 && ` · Loop ${currentLoopIteration + 1}/${loopCount}`}
          </div>
          {displayVerses.some(v => v.audio) ? (
            <p className="text-center text-xs text-primary-foreground/60 mt-1 font-sans flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" /> Real audio playback active
            </p>
          ) : (
            <p className="text-center text-xs text-primary-foreground/60 mt-1 font-sans">Audio playback is simulated — Admin: upload audio files to enable real playback</p>
          )}
        </div>
      </motion.div>

      <RemoveBottomSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          if (removeTarget.type === "bookmark") {
            removeBookmark(removeTarget.verseId);
          } else {
            removeFavourite(removeTarget.verseId);
          }
          setRemoveTarget(null);
        }}
        type={removeTarget?.type || "bookmark"}
        dashakam={removeTarget?.dashakam || 0}
        verse={removeTarget?.verse || 0}
      />
    </div>
  );
}
