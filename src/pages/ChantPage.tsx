import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, RotateCcw, ChevronDown, ChevronUp, Volume2, Square, ListMusic } from "lucide-react";
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
  TRANSLITERATION_LANGUAGES,
  type TransliterationLanguage,
} from "@/data/narayaneeyam";
import { useDashakam } from "@/hooks/useDashakam";
import { getStorageUrl } from "@/lib/storageUrl";
import { useRitualChants } from "@/hooks/useRitualChants";
import { useSlokaPlayback } from "@/hooks/useSlokaPlayback";
import RitualChantOverlay from "@/components/RitualChantOverlay";
import VerseSkeleton from "@/components/VerseSkeleton";
import { getProgress, saveProgress } from "@/lib/progress";
import { updateStreakSupabase, markVerseCompleted } from "@/lib/supabaseProgress";
import { getActiveVerseAtTime, getTimestamps } from "@/lib/audioTimestamps";
import VerseIcons from "@/components/VerseIcons";
import { Slider } from "@/components/ui/slider";
import { useMemberProgress } from "@/hooks/useMemberProgress";
import ContinueBanner from "@/components/ContinueBanner";
import { AnimatePresence as AP2 } from "framer-motion";


type RitualPhase = "idle" | "opening" | "dashakam_end" | "session_end";

export default function ChantPage() {
  const [searchParams] = useSearchParams();
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [translitLang, setTranslitLang] = useState<TransliterationLanguage>("sanskrit");
  const [showMeaning, setShowMeaning] = useState(false);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoopIteration, setCurrentLoopIteration] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [activeLine, setActiveLine] = useState(0);
  const [removeTarget, setRemoveTarget] = useState<{ type: "bookmark" | "favourite"; verseId: string; dashakam: number; verse: number } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verseRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const lineRefsMap = useRef<Map<string, HTMLSpanElement>>(new Map());
  const versesContainerRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark } = useBookmarks();
  const { isFavourited, addFavourite, removeFavourite, undoRemoveFavourite } = useFavourites();
  const [ritualPhase, setRitualPhase] = useState<RitualPhase>("idle");

  // Sloka playback
  const { activeSlokaScript, activeSlokaTranslation, isSlokaPlaying, handlePostVerse, stopSloka } = useSlokaPlayback();

  // Member progress tracking
  const { lastPosition, fetchVerseStatuses, markVerseStarted, markVerseFinished, checkDashakamCompletion, getVerseStatus, dismissBanner, isGuest } = useMemberProgress("chant");

  // ── Playlist state ──
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProgress } = usePlaylist("chant");

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

  const selectedLanguage = "en";

  // Live data from Supabase
  const { dashakamList, verses: dbVerses, loading: dbLoading, audioReady } = useDashakam(selectedDashakam, selectedLanguage);
  const { openingChants, dashakamClosingChant, sessionClosingChant } = useRitualChants(selectedLanguage);

  // Build the dashakam dropdown list from DB
  const dropdownList = dashakamList.map((d) => ({ id: d.dashakam_no, title: d.dashakam_name }));

  // Get dashakam metadata from DB list
  const dashakamMeta = dashakamList.find((d) => d.dashakam_no === selectedDashakam);

  // (removed — learn mode deleted)
  

  // Convert dbVerses to display format
  const allVerses = dbVerses.map((mv) => {
    const rawUrl = getStorageUrl(mv.chant_audio_file);
    // Accept any valid https URL (getStorageUrl already handles conversion)
    const validAudio = rawUrl && rawUrl.startsWith("https://") ? rawUrl : undefined;
    return {
      id: `${selectedDashakam}-${mv.verse_no}`,
      dashakam: selectedDashakam,
      paragraph: mv.verse_no,
      sanskrit: mv.sanskrit_text,
      english: mv.transliteration_text,
      meaning_english: mv.translation_text,
      meter: mv.meter,
      audio: validAudio,
      bell: false,
      prasadam: mv.prasadam_text || undefined,
      sloka_audio_id: mv.sloka_audio_id,
      tamil: "", malayalam: "", telugu: "", kannada: "", hindi: "", marathi: "",
      meaning_tamil: "", meaning_malayalam: "", meaning_telugu: "",
      meaning_kannada: "", meaning_hindi: "", meaning_marathi: "",
    };
  });

  // Progressive loading: show first 3 verses instantly, rest after paint
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { setShowAll(false); const t = setTimeout(() => setShowAll(true), 50); return () => clearTimeout(t); }, [selectedDashakam, selectedPara]);

  const displayVerses = selectedPara
    ? allVerses.filter((v) => v.paragraph === selectedPara)
    : allVerses;
  const visibleVerses = showAll ? displayVerses : displayVerses.slice(0, 3);

  // Restore last position or use query param
  useEffect(() => {
    const qd = searchParams.get("dashakam");
    if (qd) {
      const num = parseInt(qd, 10);
      if (num >= 1 && num <= 100) { setSelectedDashakam(num); return; }
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

  // Fetch verse statuses when dashakam changes
  useEffect(() => { fetchVerseStatuses(selectedDashakam); }, [selectedDashakam, fetchVerseStatuses]);

  // Scroll-to-center helper
  const scrollToVerse = useCallback((idx: number) => {
    const el = verseRefsMap.current.get(idx);
    if (!el) return;
    programmaticScrollRef.current = true;
    const container = el.closest('.overflow-y-auto') || el.closest('.overflow-auto') || window;
    const isWindow = container === window;
    const elTop = isWindow ? el.getBoundingClientRect().top + window.scrollY : (el as HTMLElement).offsetTop;
    const viewH = isWindow ? window.innerHeight : (container as HTMLElement).clientHeight;
    (isWindow ? window : container).scrollTo({ top: elTop - viewH / 2 + el.offsetHeight / 2, behavior: 'smooth' });
    // Release programmatic scroll lock after animation
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { programmaticScrollRef.current = false; }, 600);
  }, []);

  // Auto-scroll whenever active verse changes
  useEffect(() => {
    const timer = setTimeout(() => scrollToVerse(highlightedVerse), 100);
    return () => clearTimeout(timer);
  }, [highlightedVerse, scrollToVerse]);

  // Compute active line from verse progress
  useEffect(() => {
    if (!isPlaying) { setActiveLine(0); return; }
    const verse = displayVerses[highlightedVerse];
    if (!verse) return;
    const text = getVerseText(verse);
    const lines = text.split("\n").filter(Boolean);
    if (lines.length <= 1) { setActiveLine(0); return; }
    const lineIdx = Math.min(Math.floor((verseProgress / 100) * lines.length), lines.length - 1);
    setActiveLine(lineIdx);
  }, [verseProgress, isPlaying, highlightedVerse, displayVerses.length]);

  // Auto-scroll to active line during playback
  useEffect(() => {
    if (!isPlaying) return;
    const key = `${highlightedVerse}-${activeLine}`;
    const el = lineRefsMap.current.get(key);
    if (!el) return;
    programmaticScrollRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => { programmaticScrollRef.current = false; }, 600);
  }, [activeLine, highlightedVerse, isPlaying]);

  // Manual scroll detection — find verse closest to viewport center
  useEffect(() => {
    if (!isPlaying) return;

    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current);

      manualScrollTimerRef.current = setTimeout(() => {
        const viewCenter = window.innerHeight / 2;
        let closestIdx = highlightedVerse;
        let closestDist = Infinity;

        verseRefsMap.current.forEach((el, idx) => {
          const rect = el.getBoundingClientRect();
          const elCenter = rect.top + rect.height / 2;
          const dist = Math.abs(elCenter - viewCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closestIdx = idx;
          }
        });

        if (closestIdx !== highlightedVerse) {
          // Stop current audio, switch to the scroll-detected verse
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          pausedRef.current = false;
          stopSloka();
          setVerseProgress(0);
          setHighlightedVerse(closestIdx);
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (manualScrollTimerRef.current) clearTimeout(manualScrollTimerRef.current);
    };
  }, [isPlaying, highlightedVerse, stopSloka]);

  // Mark verse started when playback begins on a verse
  useEffect(() => {
    if (isPlaying && displayVerses[highlightedVerse]) {
      markVerseStarted(selectedDashakam, displayVerses[highlightedVerse].paragraph);
    }
  }, [isPlaying, highlightedVerse, selectedDashakam]);

  const advanceToNextVerse = useCallback(() => {
    if (highlightedVerse >= displayVerses.length - 1) {
      const effectiveLoopCount = inPlaylistMode ? (playlistItems![playlistIndex]?.loops ?? 1) : loopCount;
      const effectiveLoop = inPlaylistMode ? playlistLoop : currentLoopIteration;

      const nextLoop = effectiveLoop + 1;
      if (nextLoop < effectiveLoopCount) {
        if (inPlaylistMode) setPlaylistLoop(nextLoop);
        else setCurrentLoopIteration(nextLoop);
        setHighlightedVerse(0);
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
                setSelectedPara(null);
              }, 100);
            } else {
              setPlaylistIndex(nextIdx);
              setSelectedDashakam(playlistItems![nextIdx].dashakam_no);
              setHighlightedVerse(0);
              setSelectedPara(null);
            }
          } else {
            if (dashakamClosingChant) setRitualPhase("dashakam_end");
          }
        } else {
          setCurrentLoopIteration(0);
          if (dashakamClosingChant) setRitualPhase("dashakam_end");
        }
      }
    } else {
      setVerseProgress(0);
      gapTimerRef.current = setTimeout(() => {
        setHighlightedVerse((prev) => prev + 1);
        if (inPlaylistMode && playlistId) savePlaylistProgress(playlistId, playlistIndex, highlightedVerse + 2, playlistLoop);
      }, 1500);
    }
  }, [highlightedVerse, displayVerses.length, loopCount, currentLoopIteration, dashakamClosingChant, inPlaylistMode, playlistItems, playlistIndex, playlistLoop, playlistId, savePlaylistProgress]);

  // After verse audio ends, check for sloka before advancing
  const handleVerseEnded = useCallback(() => {
    const currentVerse = displayVerses[highlightedVerse];
    if (!currentVerse) { advanceToNextVerse(); return; }

    logAudioEvent("audio_complete", selectedDashakam, currentVerse.paragraph, currentVerse.audio || "");
    // Mark verse finished in member_progress
    markVerseFinished(selectedDashakam, currentVerse.paragraph).then(() => {
      checkDashakamCompletion(selectedDashakam, allVerses.length);
    });

    if (currentVerse.sloka_audio_id) {
      handlePostVerse(
        currentVerse.sloka_audio_id,
        selectedLanguage,
        "chant",
        speed,
        () => advanceToNextVerse()
      );
    } else {
      advanceToNextVerse();
    }
  }, [highlightedVerse, displayVerses, selectedDashakam, selectedLanguage, speed, handlePostVerse, advanceToNextVerse, markVerseFinished, checkDashakamCompletion, allVerses.length]);

  // Stable ref so the audio effect doesn't re-run when callbacks change
  const handleVerseEndedRef = useRef(handleVerseEnded);
  useEffect(() => { handleVerseEndedRef.current = handleVerseEnded; }, [handleVerseEnded]);

  // Real audio playback
  useEffect(() => {
    if (!isPlaying || displayVerses.length === 0 || isSlokaPlaying) return;

    const currentVerse = displayVerses[highlightedVerse];

    if (pausedRef.current && audioRef.current && !audioRef.current.ended) {
      audioRef.current.playbackRate = speed;
      console.log('Resuming audio URL:', audioRef.current.src);
      audioRef.current.play().catch((err) => console.error("Audio play error:", err));
      pausedRef.current = false;
      logAudioEvent("audio_play", selectedDashakam, currentVerse?.paragraph || 0, "resume");

      const audio = audioRef.current;
      const updateProgress = () => {
        if (audio.duration) setVerseProgress((audio.currentTime / audio.duration) * 100);
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => handleVerseEndedRef.current();
      return () => { audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    }

    if (currentVerse?.audio) {
      const loadStart = performance.now();
      console.log('Playing audio URL:', currentVerse.audio);
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
      audio.onended = () => handleVerseEndedRef.current();
      return () => { audio.pause(); audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    } else {
      // No valid audio URL — skip to next verse after a short delay
      console.warn('No valid audio URL for verse', currentVerse?.paragraph, '— skipping');
      gapTimerRef.current = setTimeout(() => handleVerseEndedRef.current(), 2000);
      return () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current); };
    }
  }, [isPlaying, highlightedVerse, displayVerses.length, speed, isSlokaPlaying]);

  // Cleanup on unmount — stop audio when navigating away
  useEffect(() => {
    return () => {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    };
  }, []);

  const [hasPlayedOpening, setHasPlayedOpening] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) { audioRef.current.pause(); pausedRef.current = true; }
      stopSloka();
      logAudioEvent("audio_pause", selectedDashakam, displayVerses[highlightedVerse]?.paragraph || 0, "");
      setIsPlaying(false);
    } else {
      if (!audioReady) {
        console.warn("Audio not ready — waiting for Supabase data");
        return;
      }
      if (!hasPlayedOpening && openingChants.length > 0) { setRitualPhase("opening"); return; }
      logEvent("chant_started", { dashakam: selectedDashakam });
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

  const getMeaning = (verse: typeof allVerses[0]) => verse.meaning_english;

  return (
    <div className="container mx-auto px-4 py-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">
              Chant with Me
            </h1>
            <p className="text-muted-foreground font-sans">
              Follow along with synchronized text highlighting
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaylistOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-sans text-foreground hover:bg-secondary/20 transition-colors"
            >
              <ListMusic className="h-4 w-4 text-secondary" /> Playlist
            </button>
          </div>
        </div>

        {/* Continue Banner */}
        <AnimatePresence>
          {lastPosition && !isGuest && (
            <ContinueBanner
              position={lastPosition}
              onContinue={() => {
                setSelectedDashakam(lastPosition.dashakam_number);
                setHighlightedVerse(lastPosition.verse_number - 1);
                setSelectedPara(null);
                dismissBanner();
              }}
              onDismiss={dismissBanner}
            />
          )}
        </AnimatePresence>

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
            <select value={selectedDashakam} onChange={(e) => { setSelectedDashakam(Number(e.target.value)); setSelectedPara(null); setHighlightedVerse(0); setShowGist(false); setVerseProgress(0); if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); }}
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
            <label className="text-xs text-muted-foreground font-sans">Speed</label>
            <select value={speed} onChange={(e) => { setSpeed(Number(e.target.value)); if (audioRef.current) audioRef.current.playbackRate = Number(e.target.value); }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground">
              <option value={0.5}>0.5×</option><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option><option value={1.5}>1.5×</option><option value={2}>2×</option>
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
        {dashakamMeta && (
          <div className="mb-6">
            <div className="rounded-xl bg-gradient-peacock p-5">
              <h2 className="font-display text-xl font-semibold text-primary-foreground mb-1">{dashakamMeta.dashakam_name}</h2>
              <p className="text-gold-light font-sans text-sm mb-1">{dashakamMeta.dashakam_name}</p>
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => setShowGist(!showGist)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors">
                  {showGist ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showGist ? "Hide Gist" : "View Gist"}
                </button>
                {dashakamMeta.benefits && (
                  <button onClick={() => setShowBenefit(!showBenefit)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs text-gold-light font-sans hover:bg-primary-foreground/20 transition-colors">
                    {showBenefit ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {showBenefit ? "Hide Benefit" : "View Benefit"}
                  </button>
                )}
              </div>
            </div>
            <AnimatePresence>
              {showGist && dashakamMeta.gist && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                    <p className="text-sm text-foreground font-sans leading-relaxed">{dashakamMeta.gist}</p>
                  </div>
                </motion.div>
              )}
              {showBenefit && dashakamMeta.benefits && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="rounded-b-xl border border-t-0 border-border bg-card p-4">
                    <p className="text-sm text-foreground font-sans leading-relaxed">✨ {dashakamMeta.benefits}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Loading state — skeleton loader */}
        {dbLoading && (
          <div className="mb-8">
            <VerseSkeleton count={3} />
          </div>
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
          <div className="space-y-4 pb-48" ref={versesContainerRef}>
            {displayVerses.length === 0 ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="text-muted-foreground font-sans mt-2">Working with divine energy to make this available soon 🙏</p>
              </div>
            ) : (
              visibleVerses.map((verse, idx) => (
                <motion.div key={verse.id} ref={(el) => { if (el) verseRefsMap.current.set(idx, el); else verseRefsMap.current.delete(idx); }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-5 transition-all duration-500 ${idx === highlightedVerse && isPlaying ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-sans flex items-center gap-1.5">
                      {(() => {
                        const status = getVerseStatus(selectedDashakam, verse.paragraph);
                        if (status === "completed") return <span className="text-green-500" title="Completed">✓</span>;
                        if (status === "started") return <span className="text-muted-foreground" title="Started">•</span>;
                        return null;
                      })()}
                      Verse {verse.paragraph}{verse.meter ? ` · ${verse.meter}` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <VerseIcons bell={verse.bell} prasadam={verse.prasadam} slokaAudioId={verse.sloka_audio_id} />
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
                  <div className="font-body text-lg leading-relaxed">
                    {(() => {
                      const text = getVerseText(verse);
                      const lines = text.split("\n").filter(Boolean);
                      const isActiveVerse = idx === highlightedVerse && isPlaying;
                      if (lines.length <= 1 || !isActiveVerse) {
                        return (
                          <p className={`whitespace-pre-line transition-colors duration-300 ${isActiveVerse ? "text-secondary font-semibold" : "text-foreground"}`}>
                            {text}
                          </p>
                        );
                      }
                      return lines.map((line, li) => {
                        const isActive = li === activeLine;
                        return (
                          <span
                            key={li}
                            ref={(el) => {
                              const key = `${idx}-${li}`;
                              if (el) lineRefsMap.current.set(key, el);
                              else lineRefsMap.current.delete(key);
                            }}
                            className={`block py-0.5 transition-all duration-500 rounded-sm ${
                              isActive
                                ? "text-secondary font-semibold karaoke-glow"
                                : "text-foreground/60"
                            }`}
                          >
                            {line}
                          </span>
                        );
                      });
                    })()}
                  </div>
                  {/* Verse seek bar */}
                  {idx === highlightedVerse && verse.audio && (
                    <div className="mt-3">
                      <Slider value={[verseProgress]} onValueChange={handleSeekVerse} max={100} step={0.5} className="w-full" />
                    </div>
                  )}
                  {showMeaning && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 border-t border-border pt-3">
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Translation (English)</p>
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
          {/* Active module indicator */}
          {isPlaying && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
              </span>
              <span className="text-xs font-sans font-semibold text-secondary uppercase tracking-wider">
                Chant Module Active
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightedVerse(Math.max(0, highlightedVerse - 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipBack className="h-5 w-5" /></button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightedVerse(0); setCurrentLoopIteration(0); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="Restart"><RotateCcw className="h-5 w-5" /></button>
            <button onClick={handlePlayPause} disabled={!audioReady && !isPlaying} className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110 ${!audioReady && !isPlaying ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {!audioReady && !isPlaying ? (
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
            </button>
            <button onClick={() => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } pausedRef.current = false; stopSloka(); setVerseProgress(0); setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1)); }} className="text-primary-foreground/70 hover:text-primary-foreground p-2"><SkipForward className="h-5 w-5" /></button>
            <button onClick={handleEndSession} className="text-primary-foreground/70 hover:text-primary-foreground p-2" title="End Session"><Square className="h-5 w-5" /></button>
          </div>
          {/* Speed control buttons */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <span className="text-[10px] text-primary-foreground/50 font-sans mr-1">Speed</span>
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
              <button
                key={s}
                onClick={() => { setSpeed(s); if (audioRef.current) audioRef.current.playbackRate = s; }}
                className={`rounded-full px-2 py-0.5 text-[11px] font-sans transition-colors ${
                  speed === s
                    ? "bg-secondary text-secondary-foreground font-semibold"
                    : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <div className="text-center text-xs text-primary-foreground/60 mt-2 font-sans">
            Verse {highlightedVerse + 1} of {displayVerses.length}
            {loopCount > 1 && ` · Loop ${currentLoopIteration + 1}/${loopCount}`}
            {isSlokaPlaying && " · 📿 Sloka playing"}
          </div>
        </div>

        {/* Ritual Chant Overlays */}
        <AnimatePresence>
          {ritualPhase === "opening" && openingChants.length > 0 && (
            <RitualChantOverlay
              chants={openingChants}
              title="Opening Prayers"
              speed={speed}
              onComplete={() => {
                setRitualPhase("idle");
                setHasPlayedOpening(true);
                logEvent("chant_started", { dashakam: selectedDashakam });
                setIsPlaying(true);
              }}
            />
          )}
          {ritualPhase === "dashakam_end" && dashakamClosingChant && (
            <RitualChantOverlay
              chants={[dashakamClosingChant]}
              title="Dashakam Closing"
              speed={speed}
              onComplete={() => { setRitualPhase("idle"); setHighlightedVerse(0); }}
            />
          )}
          {ritualPhase === "session_end" && sessionClosingChant && (
            <RitualChantOverlay
              chants={[sessionClosingChant]}
              title="Session Closing"
              speed={speed}
              onComplete={() => { setRitualPhase("idle"); setHighlightedVerse(0); setVerseProgress(0); }}
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
        mode="chant"
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        onStartPlaylist={handleStartPlaylist}
      />
    </div>
  );
}
