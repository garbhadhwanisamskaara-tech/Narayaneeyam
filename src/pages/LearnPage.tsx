import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronDown, ChevronUp, Volume2, Square, ListMusic, RefreshCw } from "lucide-react";
import PlaylistBuilder from "@/components/PlaylistBuilder";
import PlaylistBar from "@/components/PlaylistBar";
import { usePlaylist, type PlaylistItem } from "@/hooks/usePlaylist";
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
import { useSlokaPlayback } from "@/hooks/useSlokaPlayback";
import RitualChantOverlay from "@/components/RitualChantOverlay";
import { getProgress, saveProgress } from "@/lib/progress";
import { updateStreakSupabase, markVerseCompleted } from "@/lib/supabaseProgress";
import { getActiveVerseAtTime, getTimestamps } from "@/lib/audioTimestamps";
import { getActivePhraseAtTime, getVerseTimestamp } from "@/lib/audioTimestamps";
import VerseIcons from "@/components/VerseIcons";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

type RitualPhase = "idle" | "opening" | "dashakam_end" | "session_end";

interface LanguageOption { code: string; name: string; }

export default function LearnPage() {
  const [searchParams] = useSearchParams();
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [translationLang, setTranslationLang] = useState<TranslationLanguage>("english");
  const [showMeaning, setShowMeaning] = useState(true);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(0);
  const [highlightPhrase, setHighlightPhrase] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [repeatCount, setRepeatCount] = useState(3);
  const [currentRepeat, setCurrentRepeat] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ type: "bookmark" | "favourite"; verseId: string; dashakam: number; verse: number } | null>(null);
  const [languages, setLanguages] = useState<LanguageOption[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark } = useBookmarks();
  const { isFavourited, addFavourite, removeFavourite, undoRemoveFavourite } = useFavourites();
  const [ritualPhase, setRitualPhase] = useState<RitualPhase>("idle");

  // Sloka playback
  const { activeSlokaScript, activeSlokaTranslation, isSlokaPlaying, handlePostVerse, stopSloka } = useSlokaPlayback();

  // ── Playlist state ──
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProgress } = usePlaylist("learn");

  const inPlaylistMode = playlistItems !== null && playlistItems.length > 0;

  const handleStartPlaylist = (items: PlaylistItem[], plId?: string, resumeIdx?: number, resumeVerse?: number, resumeLoop?: number) => {
    setPlaylistItems(items);
    setPlaylistId(plId);
    const idx = resumeIdx ?? 0;
    setPlaylistIndex(idx);
    setPlaylistLoop(resumeLoop ?? 0);
    setSelectedDashakam(items[idx].dashakam_no);
    setHighlightedVerse(resumeVerse ? resumeVerse - 1 : 0);
    setSelectedPara(null);
    setVerseProgress(0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pausedRef.current = false;
  };

  const exitPlaylist = () => {
    setPlaylistItems(null);
    setPlaylistIndex(0);
    setPlaylistLoop(0);
    setPlaylistId(undefined);
  };

  // Map translitLang/translationLang to a language_code for the hook
  const langCodeMap: Record<string, string> = {
    sanskrit: "sa", english: "en", tamil: "ta", malayalam: "ml",
    telugu: "te", kannada: "kn", hindi: "hi", marathi: "mr",
  };
  const selectedLanguage = langCodeMap[translationLang] || "en";

  // Live data from Supabase with static fallback
  const { dashakamList, verses: dbVerses, loading: dbLoading, staticDashakam } = useDashakam(selectedDashakam, selectedLanguage);
  const { openingChants, dashakamClosingChant, sessionClosingChant } = useRitualChants(selectedLanguage);

  // Fetch active languages
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("languages")
        .select("code, name")
        .eq("is_active", true)
        .order("name");
      if (data && data.length > 0) setLanguages(data as LanguageOption[]);
    })();
  }, []);

  // Persist language preference
  useEffect(() => {
    const saved = localStorage.getItem("narayaneeyam_lang");
    if (saved) setTranslationLang(saved as TranslationLanguage);
  }, []);
  useEffect(() => {
    localStorage.setItem("narayaneeyam_lang", translationLang);
  }, [translationLang]);

  // Build the dashakam dropdown list — prefer DB list, fallback to static
  const dropdownList = dashakamList.length > 0
    ? dashakamList.map((d) => ({ id: d.dashakam_no, title: d.dashakam_name }))
    : sampleDashakams.map((d) => ({ id: d.id, title: d.title_english }));

  // Use static dashakam for gist/benefits/title (always available)
  const dashakam = staticDashakam;

  // Convert dbVerses to display format — use learn_audio_file
  const allVerses = dbVerses.map((mv) => ({
    id: `${selectedDashakam}-${mv.verse_no}`,
    dashakam: selectedDashakam,
    paragraph: mv.verse_no,
    sanskrit: mv.sanskrit_text,
    english: mv.transliteration_text,
    meaning_english: mv.translation_text,
    meter: mv.meter,
    audio: mv.learn_audio_file || undefined,  // <-- learn_audio_file instead of chant_audio_file
    bell: mv.has_bell,
    prasadam: mv.prasadam_text || undefined,
    sloka_audio_id: mv.sloka_audio_id,
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
      if (num >= 1 && num <= 100) { setSelectedDashakam(num); return; }
    }
    const progress = getProgress();
    if (progress.learnState) {
      setSelectedDashakam((progress.learnState as any).dashakam || progress.lastDashakam || 1);
    } else {
      setSelectedDashakam(progress.lastDashakam || 1);
    }
  }, []);

  // Save position on changes
  useEffect(() => {
    saveProgress({
      lastDashakam: selectedDashakam,
      lastPage: "/learn",
      learnState: { dashakam: selectedDashakam, para: selectedPara, verse: highlightedVerse } as any,
    });
  }, [selectedDashakam, selectedPara, highlightedVerse]);

  const advanceToNextVerse = useCallback(() => {
    if (highlightedVerse >= displayVerses.length - 1) {
      const effectiveRepeatCount = inPlaylistMode ? (playlistItems![playlistIndex]?.loops ?? 1) : repeatCount;
      const effectiveRepeat = inPlaylistMode ? playlistLoop : currentRepeat;

      const nextRepeat = effectiveRepeat + 1;
      if (nextRepeat < effectiveRepeatCount) {
        if (inPlaylistMode) setPlaylistLoop(nextRepeat);
        else setCurrentRepeat(nextRepeat);
        setHighlightedVerse(0);
        setHighlightPhrase(-1);
        setVerseProgress(0);
      } else {
        setIsPlaying(false);
        updateStreakSupabase();
        setVerseProgress(0);
        if (inPlaylistMode) {
          setPlaylistLoop(0);
          if (playlistId) savePlaylistProgress(playlistId, playlistIndex, highlightedVerse + 1, 0);
          const nextIdx = playlistIndex + 1;
          if (nextIdx < playlistItems!.length) {
            if (dashakamClosingChant) {
              setRitualPhase("dashakam_end");
              setTimeout(() => {
                setPlaylistIndex(nextIdx);
                setSelectedDashakam(playlistItems![nextIdx].dashakam_no);
                setHighlightedVerse(0);
                setHighlightPhrase(-1);
                setSelectedPara(null);
              }, 100);
            } else {
              setPlaylistIndex(nextIdx);
              setSelectedDashakam(playlistItems![nextIdx].dashakam_no);
              setHighlightedVerse(0);
              setHighlightPhrase(-1);
              setSelectedPara(null);
            }
          } else {
            if (dashakamClosingChant) setRitualPhase("dashakam_end");
          }
        } else {
          setCurrentRepeat(0);
          if (dashakamClosingChant) setRitualPhase("dashakam_end");
        }
      }
    } else {
      setVerseProgress(0);
      setHighlightPhrase(-1);
      gapTimerRef.current = setTimeout(() => {
        setHighlightedVerse((prev) => prev + 1);
        if (inPlaylistMode && playlistId) savePlaylistProgress(playlistId, playlistIndex, highlightedVerse + 2, playlistLoop);
      }, 1500);
    }
  }, [highlightedVerse, displayVerses.length, repeatCount, currentRepeat, dashakamClosingChant, inPlaylistMode, playlistItems, playlistIndex, playlistLoop, playlistId, savePlaylistProgress]);

  // After verse audio ends, check for sloka before advancing
  const handleVerseEnded = useCallback(() => {
    const currentVerse = displayVerses[highlightedVerse];
    if (!currentVerse) { advanceToNextVerse(); return; }

    logAudioEvent("audio_complete", selectedDashakam, currentVerse.paragraph, currentVerse.audio || "");

    if (currentVerse.sloka_audio_id) {
      handlePostVerse(
        currentVerse.sloka_audio_id,
        selectedLanguage,
        "learn",  // <-- learn mode for sloka
        speed,
        () => advanceToNextVerse()
      );
    } else {
      advanceToNextVerse();
    }
  }, [highlightedVerse, displayVerses, selectedDashakam, selectedLanguage, speed, handlePostVerse, advanceToNextVerse]);

  // Real audio playback — uses learn_audio_file
  useEffect(() => {
    if (!isPlaying || displayVerses.length === 0 || isSlokaPlaying) return;

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
      const onTimeUpdate = () => {
        updateProgress();
        // Phrase-level highlighting
        const vt = getVerseTimestamp(selectedDashakam, currentVerse?.paragraph || 0);
        if (vt && vt.phraseEndTimes.length > 0) {
          const phraseIdx = getActivePhraseAtTime(selectedDashakam, currentVerse?.paragraph || 0, audio.currentTime);
          setHighlightPhrase(phraseIdx);
        }
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.onended = () => handleVerseEnded();
      return () => { audio.removeEventListener("timeupdate", onTimeUpdate); audio.onended = null; };
    }

    if (currentVerse?.audio) {
      const loadStart = performance.now();
      const audio = new Audio(currentVerse.audio);
      audioRef.current = audio;
      audio.playbackRate = speed;
      pausedRef.current = false;
      setHighlightPhrase(0);

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

      const onTimeUpdate = () => {
        if (audio.duration) setVerseProgress((audio.currentTime / audio.duration) * 100);
        // Phrase-level highlighting
        const vt = getVerseTimestamp(selectedDashakam, currentVerse.paragraph);
        if (vt && vt.phraseEndTimes.length > 0) {
          const phraseIdx = getActivePhraseAtTime(selectedDashakam, currentVerse.paragraph, audio.currentTime);
          setHighlightPhrase(phraseIdx);
        }
      };
      audio.addEventListener("timeupdate", onTimeUpdate);
      audio.onended = () => handleVerseEnded();
      return () => { audio.pause(); audio.removeEventListener("timeupdate", onTimeUpdate); audio.onended = null; };
    } else {
      const interval = setInterval(() => {
        setVerseProgress((prev) => {
          if (prev >= 100) { handleVerseEnded(); return 0; }
          return prev + (speed * 2.5);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isPlaying, highlightedVerse, displayVerses.length, speed, handleVerseEnded, isSlokaPlaying]);

  // Cleanup
  useEffect(() => {
    return () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current); };
  }, []);

  const [hasPlayedOpening, setHasPlayedOpening] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) { audioRef.current.pause(); pausedRef.current = true; }
      stopSloka();
      logAudioEvent("audio_pause", selectedDashakam, displayVerses[highlightedVerse]?.paragraph || 0, "");
      setIsPlaying(false);
    } else {
      if (!hasPlayedOpening && openingChants.length > 0) { setRitualPhase("opening"); return; }
      logEvent("learn_started", { dashakam: selectedDashakam });
      setHighlightPhrase(0);
      setIsPlaying(true);
    }
  };

  const handleEndSession = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pausedRef.current = false;
    stopSloka();
    setIsPlaying(false);
    if (sessionClosingChant) {
      setRitualPhase("session_end");
    } else {
      setHighlightedVerse(0);
      setHighlightPhrase(-1);
      setVerseProgress(0);
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
    return verse.english || verse.sanskrit;
  };

  const getVerseLines = (verse: typeof allVerses[0]) => {
    const text = getVerseText(verse);
    return (text || "").split("\n").filter(Boolean);
  };

  const getMeaning = (verse: typeof allVerses[0]) => verse.meaning_english;

  return (
    <div className="container mx-auto px-4 py-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Learn with Me</h1>
            <p className="text-muted-foreground font-sans">Listen and repeat during the pause — learn at your own pace</p>
          </div>
          <button
            onClick={() => setPlaylistOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-sans text-foreground hover:bg-secondary/20 transition-colors"
          >
            <ListMusic className="h-4 w-4 text-secondary" /> Custom Playlist
          </button>
        </div>

        {/* Playlist Bar */}
        {inPlaylistMode && (
          <PlaylistBar
            items={playlistItems!}
            currentIndex={playlistIndex}
            currentLoop={playlistLoop}
            totalCompleted={playlistIndex}
            onPrevDashakam={() => {
              if (playlistIndex > 0) {
                const newIdx = playlistIndex - 1;
                setPlaylistIndex(newIdx); setPlaylistLoop(0);
                setSelectedDashakam(playlistItems![newIdx].dashakam_no);
                setHighlightedVerse(0); setSelectedPara(null); setVerseProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false; stopSloka();
              }
            }}
            onNextDashakam={() => {
              if (playlistIndex < playlistItems!.length - 1) {
                const newIdx = playlistIndex + 1;
                setPlaylistIndex(newIdx); setPlaylistLoop(0);
                setSelectedDashakam(playlistItems![newIdx].dashakam_no);
                setHighlightedVerse(0); setSelectedPara(null); setVerseProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false; stopSloka();
              }
            }}
            onSkipLoop={() => {
              setPlaylistLoop(0);
              const nextIdx = playlistIndex + 1;
              if (nextIdx < playlistItems!.length) {
                setPlaylistIndex(nextIdx);
                setSelectedDashakam(playlistItems![nextIdx].dashakam_no);
                setHighlightedVerse(0); setSelectedPara(null); setVerseProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false; stopSloka();
              }
            }}
            onExit={exitPlaylist}
          />
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select value={selectedDashakam} onChange={(e) => { setSelectedDashakam(Number(e.target.value)); setSelectedPara(null); setHighlightedVerse(0); setHighlightPhrase(-1); setShowGist(false); setVerseProgress(0); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); }}
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
              {languages.length > 0
                ? languages.map((l) => (<option key={l.code} value={l.code === "en" ? "english" : l.code === "ta" ? "tamil" : l.code === "ml" ? "malayalam" : l.code === "te" ? "telugu" : l.code === "kn" ? "kannada" : l.code === "hi" ? "hindi" : l.code === "mr" ? "marathi" : l.code}>{l.name}</option>))
                : TRANSLATION_LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))
              }
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Speed</label>
            <select value={speed} onChange={(e) => { setSpeed(Number(e.target.value)); if (audioRef.current) audioRef.current.playbackRate = Number(e.target.value); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value={0.75}>0.75×</option>
              <option value={1}>1×</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Repeats</label>
            <select value={repeatCount} onChange={(e) => setRepeatCount(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}×</option>))}
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

        {/* Repeat Indicator Banner */}
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-secondary/30 bg-secondary/10 p-3 flex items-center gap-3"
          >
            <RefreshCw className="h-5 w-5 text-secondary animate-spin" style={{ animationDuration: "3s" }} />
            <div>
              <p className="text-sm font-semibold text-foreground font-sans">Listen and repeat during the pause</p>
              <p className="text-xs text-muted-foreground font-sans">
                The learn audio has built-in silence gaps for you to repeat each phrase
                {repeatCount > 1 && ` · Repeat ${currentRepeat + 1} of ${repeatCount}`}
              </p>
            </div>
          </motion.div>
        )}

        {/* Sloka Overlay */}
        <AnimatePresence>
          {activeSlokaScript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-x-4 top-1/4 z-50 mx-auto max-w-lg rounded-2xl border border-secondary/40 bg-card/95 backdrop-blur-md p-6 shadow-gold"
            >
              <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-2">📿 Sloka</p>
              <p className="font-body text-lg leading-relaxed text-foreground whitespace-pre-line mb-3">
                {activeSlokaScript}
              </p>
              {activeSlokaTranslation && (
                <p className="text-sm text-muted-foreground font-sans leading-relaxed border-t border-border pt-2">
                  {activeSlokaTranslation}
                </p>
              )}
              {isSlokaPlaying && (
                <p className="text-xs text-secondary font-sans mt-2 animate-pulse">♪ Playing sloka audio…</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Verses */}
        {!dbLoading && (
          <div className="space-y-4 mb-8">
            {displayVerses.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="text-muted-foreground font-sans">No verses available for this Dashakam yet. Admin needs to upload content.</p>
              </div>
            ) : (
              displayVerses.map((verse, idx) => {
                const lines = getVerseLines(verse);
                const isActiveVerse = idx === highlightedVerse && isPlaying;

                return (
                  <motion.div key={verse.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                    className={`rounded-xl border p-5 transition-all duration-500 ${isActiveVerse ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs text-muted-foreground font-sans">
                        Verse {verse.paragraph} · {verse.meter}
                        {verse.sloka_audio_id && <span className="ml-2 text-secondary">📿</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <VerseIcons bell={verse.bell} prasadam={verse.prasadam} />
                        <BookmarkButton
                          active={isBookmarked(verse.id)}
                          onClick={() => {
                            if (isBookmarked(verse.id)) {
                              setRemoveTarget({ type: "bookmark", verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph });
                            } else {
                              addBookmark({ verseId: verse.id, dashakam: verse.dashakam, verse: verse.paragraph, mode: "learn" });
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

                    {/* Line-by-line highlighting */}
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

                    {/* Verse seek bar */}
                    {isActiveVerse && verse.audio && (
                      <div className="mt-3">
                        <Slider value={[verseProgress]} onValueChange={handleSeekVerse} max={100} step={0.5} className="w-full" />
                      </div>
                    )}

                    {showMeaning && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation ({translationLang})</p>
                        <p className="text-sm text-muted-foreground font-sans leading-relaxed">{getMeaning(verse)}</p>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}

        {/* Audio Player Bar */}
        <div className="sticky bottom-0 bg-gradient-peacock rounded-t-xl p-4 shadow-peacock">
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightPhrase(-1); setHighlightedVerse(Math.max(0, highlightedVerse - 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipBack className="h-5 w-5" /></button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightPhrase(-1); setHighlightedVerse(0); setCurrentRepeat(0); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={handlePlayPause} className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110">
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightPhrase(-1); setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipForward className="h-5 w-5" /></button>
            <button onClick={handleEndSession} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="End Session"><Square className="h-5 w-5" /></button>
          </div>
          <div className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">
            Verse {highlightedVerse + 1} of {displayVerses.length}
            {repeatCount > 1 && ` · Repeat ${currentRepeat + 1}/${repeatCount}`}
            {highlightPhrase >= 0 && ` · Line ${highlightPhrase + 1}`}
            {isSlokaPlaying && " · 📿 Sloka playing"}
          </div>
          {displayVerses.some(v => v.audio) ? (
            <p className="text-center text-xs text-primary-foreground/60 mt-1 font-sans flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" /> Learn audio playback active
            </p>
          ) : (
            <p className="text-center text-xs text-primary-foreground/60 mt-1 font-sans">Audio playback is simulated — Admin: upload learn audio files to enable real playback</p>
          )}
        </div>

        {/* Ritual Chant Overlays */}
        <AnimatePresence>
          {ritualPhase === "opening" && openingChants.length > 0 && (
            <RitualChantOverlay
              chants={openingChants}
              useLearnAudio
              title="Opening Prayers"
              speed={speed}
              onComplete={() => {
                setRitualPhase("idle");
                setHasPlayedOpening(true);
                logEvent("learn_started", { dashakam: selectedDashakam });
                setHighlightPhrase(0);
                setIsPlaying(true);
              }}
            />
          )}
          {ritualPhase === "dashakam_end" && dashakamClosingChant && (
            <RitualChantOverlay
              chants={[dashakamClosingChant]}
              useLearnAudio
              title="Dashakam Closing"
              speed={speed}
              onComplete={() => { setRitualPhase("idle"); setHighlightedVerse(0); setHighlightPhrase(-1); }}
            />
          )}
          {ritualPhase === "session_end" && sessionClosingChant && (
            <RitualChantOverlay
              chants={[sessionClosingChant]}
              useLearnAudio
              title="Session Closing"
              speed={speed}
              onComplete={() => { setRitualPhase("idle"); setHighlightedVerse(0); setHighlightPhrase(-1); setVerseProgress(0); }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      <RemoveBottomSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (!removeTarget) return;
          if (removeTarget.type === "bookmark") removeBookmark(removeTarget.verseId);
          else removeFavourite(removeTarget.verseId);
          setRemoveTarget(null);
        }}
        type={removeTarget?.type || "bookmark"}
        dashakam={removeTarget?.dashakam || 0}
        verse={removeTarget?.verse || 0}
      />

      <PlaylistBuilder
        mode="learn"
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        onStartPlaylist={handleStartPlaylist}
      />
    </div>
  );
}
