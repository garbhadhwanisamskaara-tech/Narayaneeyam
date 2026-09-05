import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Square,
  ListMusic,
} from "lucide-react";
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
import { TRANSLITERATION_LANGUAGES, type TransliterationLanguage } from "@/data/narayaneeyam";
import { useActiveLanguages } from "@/hooks/useActiveLanguages";
import { useDashakam } from "@/hooks/useDashakam";
import { getStorageUrl } from "@/lib/storageUrl";
import { useRitualChants } from "@/hooks/useRitualChants";
import { useSlokaPlayback } from "@/hooks/useSlokaPlayback";
import { useNextVerseAudioPreload } from "@/hooks/useNextVerseAudioPreload";

import RitualChantOverlay from "@/components/RitualChantOverlay";
import { LearnBadge } from "@/components/LearnBadge";
import VerseSkeleton from "@/components/VerseSkeleton";
import { getProgress, saveProgress } from "@/lib/progress";
import { updateStreakSupabase } from "@/lib/supabaseProgress";
import { useAudioEngine } from "@/contexts/AudioContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalMute } from "@/lib/globalMute";

import VerseIcons from "@/components/VerseIcons";
import SEO from "@/components/SEO";
import { useLanguagePrefs } from "@/hooks/useLanguagePrefs";
import { Slider } from "@/components/ui/slider";
import { useMemberProgress } from "@/hooks/useMemberProgress";
import ContinueBanner from "@/components/ContinueBanner";
import { AnimatePresence as AP2 } from "framer-motion";

type RitualPhase = "idle" | "opening" | "dashakam_end" | "session_end";

const DEFAULT_DASHAKAM = 1;

function normalizeDashakam(value: unknown, fallback = DEFAULT_DASHAKAM) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 100 ? parsed : fallback;
}

export default function ChantPage() {
  const [searchParams] = useSearchParams();
  const [selectedDashakam, setSelectedDashakam] = useState(DEFAULT_DASHAKAM);
  const [selectedPara, setSelectedPara] = useState<number | null>(null);
  const [showMeaning, setShowMeaning] = useState(false);
  const [showGist, setShowGist] = useState(false);
  const [showBenefit, setShowBenefit] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [highlightedVerse, setHighlightedVerse] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const chantSpeedLoadedRef = useRef(false);
  speedRef.current = speed;
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoopIteration, setCurrentLoopIteration] = useState(0);
  const [verseProgress, setVerseProgress] = useState(0);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const prevHighlightedVerseRef = useRef(highlightedVerse);
  const [removeTarget, setRemoveTarget] = useState<{
    type: "bookmark" | "favourite";
    verseId: string;
    dashakam: number;
    verse: number;
  } | null>(null);

  // Global audio engine (singleton, survives navigation)
  const engine = useAudioEngine();
  const { user } = useAuth();
  const [muted, toggleMuted] = useGlobalMute();
  const { scriptLang: translitLang, translationLang } = useLanguagePrefs();
  const activeLanguages = useActiveLanguages();

  const pausedRef = useRef(false);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verseRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const lineRefsMap = useRef<Map<string, HTMLSpanElement>>(new Map());
  const versesContainerRef = useRef<HTMLDivElement | null>(null);
  const programmaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Live-measured sticky offset (app header + chant control bar + safe-area inset)
  const stickyBarRef = useRef<HTMLDivElement | null>(null);
  const measureStickyOffsetRef = useRef<() => number>(() => 0);
  measureStickyOffsetRef.current = () => {
    const appHeader = document.querySelector("header");
    const headerBox = appHeader?.getBoundingClientRect().height ?? 0;
    const barBox = stickyBarRef.current?.getBoundingClientRect().height ?? 0;
    const safeTop = (() => {
      if (typeof window === "undefined") return 0;
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--safe-area-top");
      const parsed = parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    })();
    return headerBox + barBox + safeTop;
  };

  const manualScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark } = useBookmarks();
  const { isFavourited, addFavourite, removeFavourite, undoRemoveFavourite } = useFavourites(translitLang || "en");
  const [ritualPhase, setRitualPhase] = useState<RitualPhase>("idle");

  // Sloka playback
  const { activeSlokaScript, activeSlokaTranslation, isSlokaPlaying, handlePostVerse, stopSloka } = useSlokaPlayback();

  // Member progress tracking
  const {
    lastPosition,
    fetchVerseStatuses,
    markVerseStarted,
    markVerseFinished,
    checkDashakamCompletion,
    getVerseStatus,
    dismissBanner,
    isGuest,
  } = useMemberProgress("chant");

  // ── Playlist state ──
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProgress } = usePlaylist("chant");

  const inPlaylistMode = playlistItems !== null && playlistItems.length > 0;

  // Helper to stop the global audio engine
  const stopAudio = useCallback(() => {
    engine.stop();
    pausedRef.current = false;
  }, [engine]);

  // Load and persist the user's preferred chant playback speed
  useEffect(() => {
    if (!user || chantSpeedLoadedRef.current) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("chant_speed")
        .eq("id", user.id)
        .single();
      if (!error && data && typeof data.chant_speed === "number") {
        const saved = data.chant_speed as number;
        setSpeed(saved);
        speedRef.current = saved;
        engine.setSpeed(saved);
      }
      chantSpeedLoadedRef.current = true;
    })();
  }, [user, engine]);

  const persistChantSpeed = useCallback(
    (s: number) => {
      if (!user) return;
      void (supabase as any)
        .from("profiles")
        .update({ chant_speed: s })
        .eq("id", user.id)
        .then(({ error }: any) => {
          if (error) console.warn("Failed to save chant speed:", error.message);
        });
    },
    [user],
  );

  const handleStartPlaylist = (
    items: PlaylistItem[],
    plId?: string,
    resumeIdx?: number,
    resumeVerse?: number,
    resumeLoop?: number,
  ) => {
    setPlaylistItems(items);
    setPlaylistId(plId);
    const idx = resumeIdx ?? 0;
    setPlaylistIndex(idx);
    setPlaylistLoop(resumeLoop ?? 0);
    setSelectedDashakam(items[idx].dashakam_no);
    setHighlightedVerse(resumeVerse ? resumeVerse - 1 : 0);
    setSelectedPara(null);
    setVerseProgress(0);
    stopAudio();
  };

  const exitPlaylist = () => {
    setPlaylistItems(null);
    setPlaylistIndex(0);
    setPlaylistLoop(0);
    setPlaylistId(undefined);
  };

  // Transliteration language drives the script shown in verses; ritual chants stay in English
  const selectedLanguage = translitLang || "en";

  // Live data from Supabase
  const {
    dashakamList,
    verses: dbVerses,
    loading: dbLoading,
    audioReady,
  } = useDashakam(selectedDashakam, selectedLanguage, translationLang);

  // Language the translations are actually rendered in (falls back to English
  // when the preferred translation language has no content for this dashakam)
  const effectiveTranslationLang =
    dbVerses.find((v) => v.translation_text)?.translation_language || translationLang;
  const { openingChants, dashakamClosingChant, sessionClosingChant } = useRitualChants(translitLang);

  // Build the dashakam dropdown list from DB
  const dropdownList = dashakamList.map((d) => ({
    id: d.dashakam_no,
    title: d.dashakam_name,
    available: d.is_published,
  }));

  // Get dashakam metadata from DB list
  const dashakamMeta = dashakamList.find((d) => d.dashakam_no === selectedDashakam);
  const comingSoon = !!dashakamMeta && !dashakamMeta.is_published;

  useEffect(() => {
    if (!dashakamList.length) return;

    const hasSelectedDashakam = dashakamList.some((d) => d.dashakam_no === selectedDashakam);
    if (hasSelectedDashakam) return;

    const firstReady = dashakamList.find((d) => d.is_published) ?? dashakamList[0];
    setSelectedDashakam(firstReady.dashakam_no);
    setSelectedPara(null);
    setHighlightedVerse(0);
  }, [dashakamList, selectedDashakam]);

  // Convert dbVerses to display format
  const allVerses = dbVerses.map((mv) => {
    const rawUrl = getStorageUrl(mv.chant_audio_file);
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
      
      prasadam: mv.prasadam_text || undefined,
      sloka_audio_id: mv.sloka_audio_id,
      tamil: "",
      malayalam: "",
      telugu: "",
      kannada: "",
      hindi: "",
      marathi: "",
      meaning_tamil: "",
      meaning_malayalam: "",
      meaning_telugu: "",
      meaning_kannada: "",
      meaning_hindi: "",
      meaning_marathi: "",
    };
  });

  // Progressive loading
  const [showAll, setShowAll] = useState(false);
  useEffect(() => {
    setShowAll(false);
    const t = setTimeout(() => setShowAll(true), 50);
    return () => clearTimeout(t);
  }, [selectedDashakam, selectedPara]);

  const displayVerses = selectedPara ? allVerses.filter((v) => v.paragraph === selectedPara) : allVerses;
  const hasVerses = displayVerses.length > 0;
  const visibleVerses = showAll ? displayVerses : displayVerses.slice(0, 3);

  // Pending verse (paragraph number) requested via ?verse= query param
  const pendingVerseRef = useRef<number | null>(null);
  // Whether that jump should also start playing the verse from its beginning
  const pendingAutoPlayRef = useRef(false);

  // Restore last position or use query param
  useEffect(() => {
    const qd = searchParams.get("dashakam");
    const qv = searchParams.get("verse");
    if (qv) {
      const vnum = parseInt(qv, 10);
      if (vnum >= 1) {
        pendingVerseRef.current = vnum;
        pendingAutoPlayRef.current = searchParams.get("play") === "1";
      }
    }
    if (qd) {
      const num = normalizeDashakam(parseInt(qd, 10));
      if (num >= 1 && num <= 100) {
        setSelectedDashakam(num);
        return;
      }
    }
    const progress = getProgress();
    if (progress.chantState) {
      setSelectedDashakam(normalizeDashakam(progress.chantState.dashakam));
      setSelectedPara(progress.chantState.para);
      setHighlightedVerse(Math.max(0, Number(progress.chantState.verse) || 0));
    } else {
      setSelectedDashakam(normalizeDashakam(progress.lastDashakam));
    }
  }, []);

  // Once verses are loaded, jump to the verse requested via ?verse=
  useEffect(() => {
    if (pendingVerseRef.current == null || displayVerses.length === 0) return;
    const target = pendingVerseRef.current;
    const idx = displayVerses.findIndex((v) => v.paragraph === target);
    pendingVerseRef.current = null;
    const shouldPlay = pendingAutoPlayRef.current;
    pendingAutoPlayRef.current = false;
    if (idx >= 0) {
      setHighlightedVerse(idx);
      setTimeout(() => scrollToVerse(idx), 200);
      if (shouldPlay) {
        // Start cleanly at the top of the bookmarked verse
        stopAudio();
        stopSloka();
        setVerseProgress(0);
        setCurrentLoopIteration(0);
        setIsPaused(false);
        setHasPlayedOpening(true);
        setIsPlaying(true);
      }
    }
  }, [displayVerses]);



  // Save position on changes
  useEffect(() => {
    saveProgress({
      lastDashakam: selectedDashakam,
      lastPage: "/chant",
      chantState: { dashakam: selectedDashakam, para: selectedPara, verse: highlightedVerse },
    });
  }, [selectedDashakam, selectedPara, highlightedVerse]);

  // Fetch verse statuses when dashakam changes
  useEffect(() => {
    fetchVerseStatuses(selectedDashakam);
  }, [selectedDashakam, fetchVerseStatuses]);

  // Scroll helper — offsets by the live sticky-header height (never hardcoded)
  const scrollElementIntoView = useCallback((el: HTMLElement) => {
    programmaticScrollRef.current = true;
    const container = el.closest(".overflow-y-auto") || el.closest(".overflow-auto") || window;
    const isWindow = container === window;
    const offset = measureStickyOffsetRef.current() + 8;
    const viewH = isWindow ? window.innerHeight : (container as HTMLElement).clientHeight;
    const currentTop = isWindow ? window.scrollY : (container as HTMLElement).scrollTop;
    const elTop = isWindow
      ? el.getBoundingClientRect().top + window.scrollY
      : (el as HTMLElement).offsetTop;
    const usableH = Math.max(0, viewH - offset);
    // Centre within the visible area below the sticky header, but never let the
    // element's first line slide underneath it.
    const centred = elTop - offset - Math.max(0, (usableH - el.offsetHeight) / 2);
    const top = Math.max(0, Math.min(centred, elTop - offset));
    if (Math.abs(top - currentTop) < 2) {
      programmaticScrollRef.current = false;
      return;
    }
    (isWindow ? window : container).scrollTo({ top, behavior: "smooth" });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 600);
  }, []);

  const scrollToVerse = useCallback(
    (idx: number) => {
      const el = verseRefsMap.current.get(idx);
      if (!el) return;
      // Wait for layout (header/dropdowns) to settle before measuring
      requestAnimationFrame(() => requestAnimationFrame(() => scrollElementIntoView(el)));
    },
    [scrollElementIntoView],
  );

  // Auto-scroll whenever active verse changes
  useEffect(() => {
    const timer = setTimeout(() => scrollToVerse(highlightedVerse), 100);
    return () => clearTimeout(timer);
  }, [highlightedVerse, scrollToVerse]);


  // Clear highlighting when verse changes
  useEffect(() => {
    if (highlightedVerse !== prevHighlightedVerseRef.current) {
      setActiveLine(null);
      prevHighlightedVerseRef.current = highlightedVerse;
    }
  }, [highlightedVerse]);

  // Progress bar is driven purely by the engine's media events (no polling)
  const enginePlaybackProgress = engine.state.progress;
  useEffect(() => {
    if (!isPlaying || isSlokaPlaying) return;
    setVerseProgress(enginePlaybackProgress);
  }, [enginePlaybackProgress, isPlaying, isSlokaPlaying]);


  // Sync verse progress from global engine
  useEffect(() => {
    if (!isPlaying) {
      // Keep the current highlight frozen while paused
      if (!isPaused) setActiveLine(null);
      return;
    }
    const verse = displayVerses[highlightedVerse];
    if (!verse) return;
    const text = getVerseText(verse);
    const lines = text.split("\n").filter(Boolean);
    if (lines.length <= 1) {
      setActiveLine(0);
      return;
    }
    if (verseProgress >= 100) {
      setActiveLine(lines.length - 1);
      return;
    }
    const lineIdx = Math.min(Math.floor((verseProgress / 100) * lines.length), lines.length - 1);
    setActiveLine(lineIdx);
  }, [verseProgress, isPlaying, isPaused, highlightedVerse, displayVerses.length]);

  // Auto-scroll to active line during playback
  useEffect(() => {
    if (!isPlaying) return;
    const key = `${highlightedVerse}-${activeLine}`;
    const el = lineRefsMap.current.get(key);
    if (!el) return;
    requestAnimationFrame(() => scrollElementIntoView(el));
  }, [activeLine, highlightedVerse, isPlaying, scrollElementIntoView]);


  // Manual scroll detection
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
          stopAudio();
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
  }, [isPlaying, highlightedVerse, stopSloka, stopAudio]);

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
      // Immediately advance to next verse — no silence gap
      setHighlightedVerse((prev) => prev + 1);
      if (inPlaylistMode && playlistId)
        savePlaylistProgress(playlistId, playlistIndex, highlightedVerse + 2, playlistLoop);
    }
  }, [
    highlightedVerse,
    displayVerses.length,
    loopCount,
    currentLoopIteration,
    dashakamClosingChant,
    inPlaylistMode,
    playlistItems,
    playlistIndex,
    playlistLoop,
    playlistId,
    savePlaylistProgress,
  ]);

  // After verse audio ends, check for sloka before advancing
  const handleVerseEnded = useCallback(() => {
    const currentVerse = displayVerses[highlightedVerse];

    if (!currentVerse) {
      advanceToNextVerse();
      return;
    }

    logAudioEvent("audio_complete", selectedDashakam, currentVerse.paragraph, currentVerse.audio || "");
    markVerseFinished(selectedDashakam, currentVerse.paragraph).then(() => {
      checkDashakamCompletion(selectedDashakam, allVerses.length);
    });

    if (currentVerse.sloka_audio_id) {
      handlePostVerse(
        currentVerse.sloka_audio_id,
        selectedLanguage,
        "chant",
        speed,
        () => advanceToNextVerse(),
      );
    } else {
      advanceToNextVerse();
    }
  }, [
    highlightedVerse,
    displayVerses,
    selectedDashakam,
    selectedLanguage,
    speed,
    handlePostVerse,
    advanceToNextVerse,
    markVerseFinished,
    checkDashakamCompletion,
    allVerses.length,
  ]);

  // Stable ref so the audio effect doesn't re-run when callbacks change
  const handleVerseEndedRef = useRef(handleVerseEnded);
  useEffect(() => {
    handleVerseEndedRef.current = handleVerseEnded;
  }, [handleVerseEnded]);

  // ── Next-verse audio preloading (cache warm-up only, never played) ──
  const { preload: preloadNextAudio, wasPreloaded } = useNextVerseAudioPreload();

  /**
   * The single next audio source implied by the existing sequence + repeat rules.
   * Null whenever preloading would be wasteful (not playing, no current source,
   * last verse of the last loop, or a Dashakam handoff we can't predict here).
   */
  const nextAudioUrl = useMemo(() => {
    if (!isPlaying || displayVerses.length === 0) return null;
    const current = displayVerses[highlightedVerse];
    if (!current?.audio) return null; // current source missing — nothing to chain from

    if (highlightedVerse < displayVerses.length - 1) {
      return displayVerses[highlightedVerse + 1]?.audio ?? null;
    }

    // Last verse: the sequence repeats from verse 1 only if a loop remains
    const effectiveLoopCount = inPlaylistMode ? (playlistItems![playlistIndex]?.loops ?? 1) : loopCount;
    const effectiveLoop = inPlaylistMode ? playlistLoop : currentLoopIteration;
    if (effectiveLoop + 1 < effectiveLoopCount) {
      return displayVerses[0]?.audio ?? null;
    }
    return null;
  }, [
    isPlaying,
    displayVerses,
    highlightedVerse,
    inPlaylistMode,
    playlistItems,
    playlistIndex,
    playlistLoop,
    loopCount,
    currentLoopIteration,
  ]);

  // Replaces/cancels automatically when Dashakam, verse, language, playlist,
  // repeat count or playback state changes (all feed nextAudioUrl).
  // The currently playing source is passed so a repeating source is never re-fetched.
  useEffect(() => {
    preloadNextAudio(nextAudioUrl, displayVerses[highlightedVerse]?.audio ?? null);
  }, [nextAudioUrl, preloadNextAudio, displayVerses, highlightedVerse]);




  // Real audio playback via global engine
  useEffect(() => {
    if (!isPlaying || displayVerses.length === 0 || isSlokaPlaying) return;

    const currentVerse = displayVerses[highlightedVerse];
    const audioEl = engine.audioElement.current;

    // Guards against stale async play requests (verse/dashakam/language change, unmount)
    let cancelled = false;

    const handlePlayFailure = () => {
      if (cancelled) return;
      // Don't leave the UI claiming playback is running; keep the verse selected
      setIsPlaying(false);
      setIsPaused(true);
      pausedRef.current = true;
      setVerseProgress(0);
      toast.error("Couldn't start audio. Tap Play to try again.");
    };

    // Resume from pause — read paused state directly from audio element to avoid stale closure
    if (pausedRef.current && audioEl && audioEl.paused && audioEl.src) {
      engine.setSpeed(speedRef.current);
      pausedRef.current = false;
      void (async () => {
        const ok = await engine.resume();
        if (cancelled) return;
        if (!ok) handlePlayFailure();
      })();
      logAudioEvent("audio_play", selectedDashakam, currentVerse?.paragraph || 0, "resume");

      // Wire up onEnded — progress comes from the engine's media events
      engine.onEnded.current = () => {
        if (!cancelled) handleVerseEndedRef.current();
      };

      return () => {
        cancelled = true;
        engine.onEnded.current = null;
      };
    }


    if (currentVerse?.audio) {
      const loadStart = performance.now();

      // Set Media Session metadata for lock screen controls
      const dashakamName = dashakamMeta?.dashakam_name || `Dashakam ${selectedDashakam}`;
      engine.setMediaMetadata(`${dashakamName} - Verse ${currentVerse.paragraph}`, "Sriman Narayaneeyam");

      engine.setSpeed(speedRef.current);
      pausedRef.current = false;

      if (import.meta.env.DEV) {
        console.warn(
          "[Preload]",
          wasPreloaded(currentVerse.audio) ? "playing preloaded source" : "playing non-preloaded source",
          currentVerse.audio,
        );
      }


      void (async () => {
        const ok = await engine.play(currentVerse.audio!);
        if (cancelled) return;
        if (!ok) handlePlayFailure();
      })();

      logAudioEvent("audio_play", selectedDashakam, currentVerse.paragraph, currentVerse.audio!);

      // Wire up onEnded
      engine.onEnded.current = () => {
        if (!cancelled) handleVerseEndedRef.current();
      };

      // Load-time logging: fire on the first readiness signal we actually get.
      // canplaythrough is unreliable on mobile, so we rely on loadedmetadata/canplay/playing.
      const audioNode = engine.audioElement.current;
      let loadLogged = false;
      const onReady = () => {
        if (loadLogged) return;
        loadLogged = true;
        const loadTime = Math.round(performance.now() - loadStart);
        const eventType = loadTime > 1500 ? "audio_load_slow" : "audio_load";
        logAudioEvent(eventType, selectedDashakam, currentVerse.paragraph, currentVerse.audio!, {
          load_time_ms: loadTime,
        });
      };
      audioNode.addEventListener("loadedmetadata", onReady);
      audioNode.addEventListener("canplay", onReady);
      audioNode.addEventListener("playing", onReady);

      // Error handling — never stall on a broken file, move to the next verse
      const onError = () => {
        if (cancelled) return;
        const errMsg = audioNode.error?.message || "Unknown audio error";
        logAudioEvent("audio_error", selectedDashakam, currentVerse.paragraph, currentVerse.audio!, {
          error_message: errMsg,
        });
        captureAudioError(new Error(errMsg), {
          dashakam: selectedDashakam,
          verse: currentVerse.paragraph,
          audio_file: currentVerse.audio,
        });
        handleVerseEndedRef.current();
      };
      audioNode.addEventListener("error", onError);

      return () => {
        cancelled = true;
        engine.onEnded.current = null;
        audioNode.removeEventListener("loadedmetadata", onReady);
        audioNode.removeEventListener("canplay", onReady);
        audioNode.removeEventListener("playing", onReady);
        audioNode.removeEventListener("error", onError);
        // Audio is never paused here — pausing/stopping happens only on deliberate
        // user actions (play/pause, end session, manual scroll, navigation handlers)
      };

    } else {
      console.warn("No valid audio URL for verse", currentVerse?.paragraph, "— skipping");
      // No audio for this verse — proceed immediately, don't sit on it
      gapTimerRef.current = setTimeout(() => {
        if (!cancelled) handleVerseEndedRef.current();
      }, 0);
      return () => {
        cancelled = true;
        if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, highlightedVerse, displayVerses.length, isSlokaPlaying, currentLoopIteration, playlistLoop]);

  // Cleanup gap timers on unmount (but NOT audio — let it persist)
  useEffect(() => {
    return () => {
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current);
    };
  }, []);

  const [hasPlayedOpening, setHasPlayedOpening] = useState(false);

  const handlePlayPause = () => {
    if (isPlaying) {
      engine.pause();
      pausedRef.current = true;
      stopSloka();
      logAudioEvent("audio_pause", selectedDashakam, displayVerses[highlightedVerse]?.paragraph || 0, "");
      setIsPlaying(false);
      setIsPaused(true);
    } else {
      if (!audioReady) {
        console.warn("Audio not ready — waiting for Supabase data");
        return;
      }
      if (!hasPlayedOpening && openingChants.length > 0) {
        setRitualPhase("opening");
        return;
      }
      logEvent("chant_started", { dashakam: selectedDashakam });
      setIsPaused(false);
      setIsPlaying(true);
    }
  };

  const handleEndSession = () => {
    stopAudio();
    stopSloka();
    setIsPlaying(false);
    setIsPaused(false);
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
    engine.seek(seekTo);
  };

  const getVerseText = (verse: (typeof allVerses)[0]) => {
    // Sanskrit script always shows Devanagari; any other selection shows transliteration in chosen language
    if (translitLang === "sa") return verse.sanskrit;
    return verse.english || verse.sanskrit;
  };

  const getMeaning = (verse: (typeof allVerses)[0]) => verse.meaning_english;

  // --- Compact sticky control bar: measure the real app header height ---
  const [headerH, setHeaderH] = useState(56);
  useEffect(() => {
    const el = document.querySelector("header");
    if (!el) return;
    const measure = () => setHeaderH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  // Re-align the active verse when the sticky bar's own height changes
  // (font scaling, dropdown wrapping, orientation change)
  useEffect(() => {
    const bar = stickyBarRef.current;
    if (!bar) return;
    let last = bar.getBoundingClientRect().height;
    let raf = 0;
    const onChange = () => {
      const next = bar.getBoundingClientRect().height;
      if (Math.abs(next - last) < 1) return;
      last = next;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => scrollToVerse(highlightedVerse));
    };
    const ro = new ResizeObserver(onChange);
    ro.observe(bar);
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [highlightedVerse, scrollToVerse]);

  const [moreOpen, setMoreOpen] = useState(false);

  const selectCls =
    "h-9 rounded-lg border border-border bg-background px-2 text-sm font-sans text-foreground min-w-0";

  return (
    <div className="container mx-auto px-4 py-4 select-none" onContextMenu={(e) => e.preventDefault()}>

      <SEO path="/chant" title="Chant Narayaneeyam — All 100 Dashakams" description="Chant all 100 Dashakams of Sriman Narayaneeyam with audio, transliteration and meaning." />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Compact sticky Chant control bar */}
        <div
          ref={stickyBarRef}
          className="sticky z-40 -mx-4 mb-3 border-b border-border bg-background/95 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          style={{ top: headerH }}
        >

          {/* Compact Audio Player Bar */}
          <div className="-mx-3 mb-2 bg-gradient-peacock px-3 py-1.5 shadow-peacock md:mx-0 md:rounded-xl">
            <div className="flex flex-col items-center gap-1 md:flex-row md:justify-center md:gap-4">
              <div className="flex items-center justify-center gap-3 md:gap-4">
                <button
                  onClick={() => {
                    stopAudio();
                    stopSloka();
                    setVerseProgress(0);
                    setHighlightedVerse(Math.max(0, highlightedVerse - 1));
                  }}
                  title="Previous verse"
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                >
                  <SkipBack className="h-5 w-5" />
                </button>
                <button
                  onClick={() => {
                    stopAudio();
                    stopSloka();
                    setVerseProgress(0);
                    setHighlightedVerse(0);
                    setCurrentLoopIteration(0);
                  }}
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                  title="Restart"
                >
                  <RotateCcw className="h-5 w-5" />
                </button>
                {comingSoon ? (
                  <span className="rounded-full bg-primary-foreground/15 px-3 py-1.5 font-sans text-[11px] font-semibold text-primary-foreground">
                    Coming soon
                  </span>
                ) : (
                  <button
                    onClick={handlePlayPause}
                    disabled={!isPlaying && !audioReady}
                    className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110 ${!isPlaying && !audioReady ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                  </button>
                )}

                <button
                  onClick={() => {
                    stopAudio();
                    stopSloka();
                    setVerseProgress(0);
                    setHighlightedVerse(Math.min(displayVerses.length - 1, highlightedVerse + 1));
                  }}
                  title="Next verse"
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                >
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  onClick={handleEndSession}
                  className="text-primary-foreground/70 hover:text-primary-foreground p-1.5"
                  title="End Session"
                >
                  <Square className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5">
                <button
                  onClick={toggleMuted}
                  aria-label={muted ? "Unmute audio" : "Mute audio"}
                  title={muted ? "Unmute audio (script keeps scrolling while muted)" : "Mute audio (script keeps scrolling)"}
                  className={`rounded-full p-1.5 transition-colors ${muted ? "bg-secondary text-secondary-foreground" : "bg-primary-foreground/10 text-primary-foreground/70 hover:bg-primary-foreground/20"}`}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>

                {/* Desktop: speed pills */}
                <div className="hidden items-center gap-1.5 md:flex">
                  {[0.6, 0.75, 1, 1.25, 1.5].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSpeed(s);
                        engine.setSpeed(s);
                        persistChantSpeed(s);
                      }}
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

                {/* Mobile: single compact speed selector */}
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => {
                    const newSpeed = Number(e.target.value);
                    setSpeed(newSpeed);
                    engine.setSpeed(newSpeed);
                    persistChantSpeed(newSpeed);
                  }}
                  className="md:hidden h-7 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-2 text-[11px] font-sans text-primary-foreground"
                >
                  {[0.6, 0.75, 1, 1.25, 1.5].map((s) => (
                    <option key={s} value={s} className="text-foreground">
                      {s}×
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:flex-nowrap">
            <select
              key={dropdownList.length === 0 ? "loading" : "ready"}
              aria-label="Dashakam"
              value={selectedDashakam}
              onChange={(e) => {
                setSelectedDashakam(Number(e.target.value));
                setSelectedPara(null);
                setHighlightedVerse(0);
                setShowGist(false);
                setVerseProgress(0);
                stopAudio();
                stopSloka();
              }}
              className={`${selectCls} basis-full truncate md:basis-auto md:flex-1 md:max-w-[22rem]`}
            >
              {dropdownList.length === 0 ? (
                <option value={selectedDashakam}>Loading...</option>
              ) : (
                dropdownList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}. {d.title}
                    {d.available ? "" : " — Coming soon"}
                  </option>
                ))
              )}
            </select>

            <select
              aria-label="Verse"
              value={selectedPara || "all"}
              onChange={(e) => {
                stopAudio();
                stopSloka();
                setIsPlaying(false);
                setIsPaused(false);
                setSelectedPara(
                  e.target.value === "all" ? null : Number(e.target.value)
                );
                setHighlightedVerse(0);
                setCurrentLoopIteration(0);
                setVerseProgress(0);
                setActiveLine(null);
              }}
              className={`${selectCls} flex-1 basis-0 md:flex-none md:w-28`}
            >
              <option value="all">All verses</option>
              {Array.from({ length: allVerses.length || 0 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  Verse {n}
                </option>
              ))}
            </select>

            <select
              aria-label="Loop"

              value={loopCount}
              onChange={(e) => setLoopCount(Number(e.target.value))}
              className={`${selectCls} flex-1 basis-0 md:flex-none md:w-24`}
            >
              {[1, 2, 3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  Loop {n}×
                </option>
              ))}
            </select>

            <div className="flex basis-full items-center gap-1.5 md:basis-auto">
              <LearnBadge>
                Use Speed, Loop, and Pause/Play to learn at your own pace — slow the chant, repeat a verse, or pause anytime to follow along.
              </LearnBadge>

              <button
                onClick={() => setShowMeaning(!showMeaning)}
                className={`h-9 flex-1 rounded-lg px-3 text-sm font-sans transition-colors md:flex-none ${showMeaning ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}
              >
                Meaning
              </button>

              {dashakamMeta && (
                <button
                  onClick={() => setShowGist(!showGist)}
                  className={`hidden h-9 rounded-lg px-3 text-sm font-sans transition-colors md:inline-flex md:items-center ${showGist ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}
                >
                  Gist
                </button>
              )}
              {dashakamMeta?.benefits && (
                <button
                  onClick={() => setShowBenefit(!showBenefit)}
                  className={`hidden h-9 rounded-lg px-3 text-sm font-sans transition-colors md:inline-flex md:items-center ${showBenefit ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"}`}
                >
                  Benefit
                </button>
              )}

              {dashakamMeta && (
                <div className="relative flex-1 md:hidden">
                  <button
                    onClick={() => setMoreOpen((v) => !v)}
                    aria-expanded={moreOpen}
                    className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-border bg-background px-3 text-sm font-sans text-foreground"
                  >
                    More {moreOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  {moreOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-card shadow-gold">
                      <button
                        onClick={() => {
                          setShowGist(!showGist);
                          setMoreOpen(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm font-sans text-foreground hover:bg-muted"
                      >
                        {showGist ? "Hide Gist" : "Gist"}
                      </button>
                      {dashakamMeta.benefits && (
                        <button
                          onClick={() => {
                            setShowBenefit(!showBenefit);
                            setMoreOpen(false);
                          }}
                          className="block w-full px-3 py-2 text-left text-sm font-sans text-foreground hover:bg-muted"
                        >
                          {showBenefit ? "Hide Benefit" : "Benefit"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Chant with Me</h1>
            <p className="text-muted-foreground font-sans">Follow along with synchronized text highlighting</p>
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
                setPlaylistIndex(newIdx);
                setPlaylistLoop(0);
                setSelectedDashakam(playlistItems![newIdx].dashakam_no);
                setHighlightedVerse(0);
                setSelectedPara(null);
                setVerseProgress(0);
                stopAudio();
                stopSloka();
              }
            }}
            onNextDashakam={() => {
              if (playlistIndex < playlistItems!.length - 1) {
                const newIdx = playlistIndex + 1;
                setPlaylistIndex(newIdx);
                setPlaylistLoop(0);
                setSelectedDashakam(playlistItems![newIdx].dashakam_no);
                setHighlightedVerse(0);
                setSelectedPara(null);
                setVerseProgress(0);
                stopAudio();
                stopSloka();
              }
            }}
            onSkipLoop={() => {
              setPlaylistLoop(0);
              const nextIdx = playlistIndex + 1;
              if (nextIdx < playlistItems!.length) {
                setPlaylistIndex(nextIdx);
                setSelectedDashakam(playlistItems![nextIdx].dashakam_no);
                setHighlightedVerse(0);
                setSelectedPara(null);
                setVerseProgress(0);
                stopAudio();
                stopSloka();
              }
            }}
            onExit={exitPlaylist}
          />
        )}


        {/* Gist / Benefit / Remarks panels */}
        {dashakamMeta && (
          <AnimatePresence>
            {showGist && dashakamMeta.gist && (
              <motion.div
                key="gist"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3 rounded-xl border border-border bg-card p-3">
                  <p className="text-sm text-foreground font-sans leading-relaxed">{dashakamMeta.gist}</p>
                </div>
              </motion.div>
            )}
            {showBenefit && dashakamMeta.benefits && (
              <motion.div
                key="benefit"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-3 rounded-xl border border-border bg-card p-3">
                  <p className="text-sm text-foreground font-sans leading-relaxed">✨ {dashakamMeta.benefits}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {dashakamMeta?.remarks && (
          <p className="mb-3 text-xs text-muted-foreground font-sans leading-relaxed">{dashakamMeta.remarks}</p>
        )}


        {/* Loading state */}
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
          <div className="space-y-3 pb-28 md:pb-24" ref={versesContainerRef}>
            {comingSoon ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="font-sans text-sm font-semibold text-foreground">Coming soon</p>
                <p className="text-muted-foreground font-sans mt-2">
                  This dashakam's chant is still being recorded — check back soon! 🙏
                </p>
              </div>
            ) : !hasVerses ? (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="text-muted-foreground font-sans mt-2">
                  Working with divine energy to make this available soon 🙏
                </p>
              </div>
            ) : (
              visibleVerses.map((verse, idx) => (
                <motion.div
                  key={verse.id}
                  ref={(el) => {
                    if (el) verseRefsMap.current.set(idx, el);
                    else verseRefsMap.current.delete(idx);
                  }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-3.5 sm:p-4 transition-all duration-500 ${idx === highlightedVerse && (isPlaying || isPaused) ? "border-secondary bg-secondary/10 shadow-gold" : "border-border bg-card"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-muted-foreground font-sans flex items-center gap-1.5">
                      {(() => {
                        const status = getVerseStatus(selectedDashakam, verse.paragraph);
                        if (status === "completed")
                          return (
                            <span className="text-green-500" title="Completed">
                              ✓
                            </span>
                          );
                        if (status === "started")
                          return (
                            <span className="text-muted-foreground" title="Started">
                              •
                            </span>
                          );
                        return null;
                      })()}
                      Dashakam {verse.dashakam} · Verse {verse.paragraph}
                      {verse.meter ? ` · Meter ${verse.meter}` : ""}
                    </span>
                    <div className="flex items-center gap-1">
                      <VerseIcons prasadam={verse.prasadam} slokaAudioId={verse.sloka_audio_id} />
                      <BookmarkButton
                        active={isBookmarked(verse.id)}
                        onClick={() => {
                          if (isBookmarked(verse.id)) {
                            setRemoveTarget({
                              type: "bookmark",
                              verseId: verse.id,
                              dashakam: verse.dashakam,
                              verse: verse.paragraph,
                            });
                          } else {
                            addBookmark({
                              verseId: verse.id,
                              dashakam: verse.dashakam,
                              verse: verse.paragraph,
                              meter: verse.meter || undefined,
                              mode: "chant",
                            });
                          }
                        }}
                      />
                      <FavouriteButton
                        active={isFavourited(verse.id)}
                        onClick={() => {
                          if (isFavourited(verse.id)) {
                            setRemoveTarget({
                              type: "favourite",
                              verseId: verse.id,
                              dashakam: verse.dashakam,
                              verse: verse.paragraph,
                            });
                          } else {
                            addFavourite({
                              verseId: verse.id,
                              dashakam: verse.dashakam,
                              verse: verse.paragraph,
                              sanskrit: getVerseText(verse),
                              meter: verse.meter || undefined,
                              language: translitLang || "en",
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="font-body text-base sm:text-lg leading-relaxed break-words overflow-wrap-anywhere">
                    {(() => {
                      const text = getVerseText(verse);
                      const lines = text.split("\n").filter(Boolean);
                      const isActiveVerse = idx === highlightedVerse && (isPlaying || isPaused);
                      if (lines.length <= 1 || !isActiveVerse) {
                        return (
                          <p
                            className={`whitespace-pre-line transition-colors duration-300 ${isActiveVerse ? "text-secondary font-semibold" : "text-foreground"}`}
                          >
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
                              isActive ? "text-secondary font-semibold karaoke-glow" : "text-foreground/60"
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
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 border-t border-border pt-3"
                    >
                      <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">
                        Translation ({activeLanguages.find((l) => l.value === effectiveTranslationLang)?.label || "English"})
                      </p>
                      <p className="text-sm text-muted-foreground font-sans leading-relaxed">{getMeaning(verse)}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}





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
                setIsPaused(false);
                setIsPlaying(true);
              }}
            />
          )}
          {ritualPhase === "dashakam_end" && dashakamClosingChant && (
            <RitualChantOverlay
              chants={[dashakamClosingChant]}
              title="Dashakam Closing"
              speed={speed}
              onComplete={() => {
                setRitualPhase("idle");
                setHighlightedVerse(0);
              }}
            />
          )}
          {ritualPhase === "session_end" && sessionClosingChant && (
            <RitualChantOverlay
              chants={[sessionClosingChant]}
              title="Session Closing"
              speed={speed}
              onComplete={() => {
                setRitualPhase("idle");
                setHighlightedVerse(0);
                setVerseProgress(0);
              }}
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
