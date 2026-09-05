import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, ListMusic, Volume2 } from "lucide-react";
import { useDashakam, getDashakamName, prefetchDashakamList } from "@/hooks/useDashakam";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storageUrl";
import { getProgress, saveProgress } from "@/lib/progress";
import { Slider } from "@/components/ui/slider";
import PlaylistBuilder from "@/components/PlaylistBuilder";
import PlaylistBar from "@/components/PlaylistBar";
import { usePlaylist, type PlaylistItem } from "@/hooks/usePlaylist";
import SEO from "@/components/SEO";
import { awardFeather } from "@/hooks/useFeathers";
import { useAuth } from "@/contexts/AuthContext";
import { useGlobalMute } from "@/lib/globalMute";
import { useAudioEngine } from "@/contexts/AudioContext";
import { useAudioResume } from "@/hooks/useAudioResume";
import { useLanguagePrefs } from "@/hooks/useLanguagePrefs";
import { VolumeX } from "lucide-react";

type PlayMode = "single" | "playlist" | "all";

interface PodcastEntry {
  dashakam: number;
  podcast_audio_file: string;
}

export default function PodcastPage() {
  const { user } = useAuth();
  const [muted, toggleMuted] = useGlobalMute();
  const engine = useAudioEngine();
  const [currentDashakam, setCurrentDashakam] = useState(1);
  /** User intent to play. The visible state always comes from the engine. */
  const [wantsPlay, setWantsPlay] = useState(false);
  const isPlaying = engine.state.isPlaying;
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [showDashakamList, setShowDashakamList] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoop, setCurrentLoop] = useState(0);
  const progress = engine.state.progress;
  const elapsed = engine.state.currentTime;
  const duration = engine.state.duration;
  const [podcastData, setPodcastData] = useState<PodcastEntry[]>([]);
  const [completed, setCompleted] = useState(false);
  const { scriptLang, translationLang } = useLanguagePrefs();
  /** Monotonic id of the active playback session — stale events are ignored. */
  const playSessionRef = useRef(0);
  const pausedRef = useRef(false);
  const advanceRef = useRef<() => void>(() => {});
  const speedRef = useRef(1);
  const podcastSpeedLoadedRef = useRef(false);
  speedRef.current = speed;

  /** Stop the shared engine and invalidate any in-flight podcast session. */
  const releaseAudio = useCallback(() => {
    playSessionRef.current += 1;
    engine.onEnded.current = null;
    engine.stop();
  }, [engine]);



  // ── Playlist state ──
  const [playlistBuilderOpen, setPlaylistBuilderOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProg } = usePlaylist("podcast");

  const inPlaylistMode = playlistItems !== null && playlistItems.length > 0;

  // Load and persist the user's preferred podcast playback speed
  useEffect(() => {
    if (!user || podcastSpeedLoadedRef.current) return;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("podcast_speed")
        .eq("id", user.id)
        .single();
      if (!error && data && typeof data.podcast_speed === "number") {
        const saved = data.podcast_speed as number;
        setSpeed(saved);
        speedRef.current = saved;
        engine.setSpeed(saved);
      }
      podcastSpeedLoadedRef.current = true;
    })();
  }, [user, engine]);

  const persistPodcastSpeed = useCallback(
    (s: number) => {
      if (!user) return;
      void (supabase as any)
        .from("profiles")
        .update({ podcast_speed: s })
        .eq("id", user.id)
        .then(({ error }: any) => {
          if (error) console.warn("Failed to save podcast speed:", error.message);
        });
    },
    [user],
  );

  // Published dashakams so the dropdown only lists available ones
  const [namesReady, setNamesReady] = useState(false);
  const [publishedList, setPublishedList] = useState<{ dashakam_no: number; dashakam_name: string }[]>([]);
  useEffect(() => {
    prefetchDashakamList(scriptLang)
      .then((list) => {
        setPublishedList(list.map((d) => ({ dashakam_no: d.dashakam_no, dashakam_name: d.dashakam_name })));
        setNamesReady(true);
      })
      .catch(() => {});
  }, [scriptLang]);

  // Remarks follow the user's preferred translation language
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});
  useEffect(() => {
    prefetchDashakamList(translationLang)
      .then((list) => {
        const map: Record<number, string> = {};
        list.forEach((d) => {
          if (d.remarks) map[d.dashakam_no] = d.remarks;
        });
        setRemarksMap(map);
      })
      .catch(() => {});
  }, [translationLang]);
  const publishedNos = useMemo(() => new Set(publishedList.map((d) => d.dashakam_no)), [publishedList]);
  const publishedPodcastData = useMemo(() => podcastData.filter((p) => publishedNos.has(p.dashakam)), [podcastData, publishedNos]);

  // Redirect to the first published dashakam if the current one is not available
  useEffect(() => {
    if (publishedList.length === 0) return;
    if (!publishedNos.has(currentDashakam)) {
      setCurrentDashakam(publishedList[0].dashakam_no);
    }
  }, [publishedList, currentDashakam, publishedNos]);


  // Fetch podcast data from Supabase
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("podcast")
        .select("dashakam, podcast_audio_file")
        .order("dashakam");
      if (!error && data && data.length > 0) {
        setPodcastData(data as PodcastEntry[]);
      }
    })();
  }, []);

  const handleStartPlaylist = (items: PlaylistItem[], plId?: string, resumeIdx?: number, resumeVerse?: number, resumeLoop?: number) => {
    setPlaylistItems(items);
    setPlaylistId(plId);
    const idx = resumeIdx ?? 0;
    setPlaylistIndex(idx);
    setPlaylistLoop(resumeLoop ?? 0);
    setCurrentDashakam(items[idx].dashakam_no);
    setCurrentLoop(0);
    setCompleted(false);
    playSessionRef.current += 1; releaseAudio();
    pausedRef.current = false;
    setPlayMode("playlist");
  };

  const exitPlaylist = () => {
    setPlaylistItems(null);
    setPlaylistIndex(0);
    setPlaylistLoop(0);
    setPlaylistId(undefined);
    setPlayMode("single");
  };

  // Restore last position
  useEffect(() => {
    const saved = getProgress();
    if (saved.podcastState) {
      setCurrentDashakam(saved.podcastState.dashakam);
      setPlayMode(saved.podcastState.playMode as PlayMode || "single");
    } else if (saved.lastDashakam) {
      setCurrentDashakam(saved.lastDashakam);
    }
  }, []);

  // Save position
  useEffect(() => {
    saveProgress({
      lastDashakam: currentDashakam,
      lastPage: "/podcast",
      podcastState: { dashakam: currentDashakam, verseIdx: 0, playMode },
    });
  }, [currentDashakam, playMode]);

  // Get audio URL for a dashakam — prefer podcast table, fallback to static
  const getAudioUrl = useCallback((dashakamNo: number): string | null => {
    const entry = publishedPodcastData.find((p) => p.dashakam === dashakamNo);
    if (entry?.podcast_audio_file) return getStorageUrl(entry.podcast_audio_file);
    // Fallback: check static data for individual verse audio (not ideal for podcast)
    return null;
  }, [publishedPodcastData]);

  const dashakamName = getDashakamName(currentDashakam, scriptLang);
  const audioUrl = getAudioUrl(currentDashakam);
  const nextDashakamNo = useMemo(() => {
    const idx = publishedList.findIndex((d) => d.dashakam_no === currentDashakam);
    return idx >= 0 && idx < publishedList.length - 1 ? publishedList[idx + 1].dashakam_no : null;
  }, [publishedList, currentDashakam]);
  const nextDashakamName = nextDashakamNo ? getDashakamName(nextDashakamNo, scriptLang) : "";

  // Advance to next dashakam
  const advanceToNext = useCallback(() => {
    // The current dashakam just finished playing — award a feather
    awardFeather(user?.id, currentDashakam, "podcast");
    if (inPlaylistMode) {
      const nextLoop = playlistLoop + 1;
      const maxLoops = playlistItems![playlistIndex]?.loops ?? 1;
      if (nextLoop < maxLoops) {
        setPlaylistLoop(nextLoop);
        // Audio will restart via effect
      } else {
        setPlaylistLoop(0);
        const nextIdx = playlistIndex + 1;
        if (nextIdx < playlistItems!.length) {
          setPlaylistIndex(nextIdx);
          setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
          if (playlistId) savePlaylistProg(playlistId, nextIdx, 0, 0);
        } else {
          setWantsPlay(false);
          setCompleted(true);
        }
      }
    } else if (playMode === "all") {
      const idx = publishedList.findIndex((d) => d.dashakam_no === currentDashakam);
      if (idx >= 0 && idx < publishedList.length - 1) {
        setCurrentDashakam(publishedList[idx + 1].dashakam_no);
        setCurrentLoop(0);
      } else {
        setWantsPlay(false);
        setCompleted(true);
      }
    } else if (playMode === "single") {
      const nextLoop = currentLoop + 1;
      if (nextLoop < loopCount) {
        setCurrentLoop(nextLoop);
      } else {
        setWantsPlay(false);
        setCompleted(true);
        setCurrentLoop(0);
      }
    }
  }, [inPlaylistMode, playlistItems, playlistIndex, playlistLoop, playlistId, playMode, currentDashakam, loopCount, currentLoop, savePlaylistProg, user]);

  // Keep ref in sync
  useEffect(() => { advanceRef.current = advanceToNext; }, [advanceToNext]);

  // ── Resume service (localStorage + Supabase) ──
  const { saveNow: saveResume, clearPosition: clearResume } = useAudioResume({
    mode: "podcast",
    isPlaying,
    getSnapshot: () => ({
      dashakamNumber: currentDashakam,
      verseNumber: 0,
      currentTimeSeconds: engine.state.currentTime,
      durationSeconds: engine.state.duration,
      audioUrl: engine.state.src,
      playMode,
    }),
  });

  // Media Session metadata — always replaces any stale Chant metadata
  useEffect(() => {
    engine.setMediaMetadata(`Dashakam ${currentDashakam} — ${dashakamName}`, "Sriman Narayaneeyam");
  }, [engine, currentDashakam, dashakamName, wantsPlay]);

  // Audio playback via the shared global engine
  useEffect(() => {
    if (!wantsPlay) return;

    // Session guard: an event from an older dashakam/loop can never advance
    // the newly selected one.
    playSessionRef.current += 1;
    const session = playSessionRef.current;
    let finished = false;
    const finishOnce = () => {
      if (finished || playSessionRef.current !== session) return;
      finished = true;
      clearResume(); // playback of this source completed
      advanceRef.current();
    };

    const url = getAudioUrl(currentDashakam);
    if (!url) {
      setWantsPlay(false);
      return;
    }

    engine.setSpeed(speedRef.current);
    engine.onEnded.current = finishOnce;

    // Resume in place after a pause on the same source; otherwise (re)start it
    if (pausedRef.current && engine.state.src === url) {
      void engine.resume();
    } else {
      void engine.play(url);
    }
    pausedRef.current = false;

    return () => {
      finished = true; // cleanup itself never advances a loop
      if (engine.onEnded.current === finishOnce) engine.onEnded.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsPlay, currentDashakam, currentLoop, playlistLoop, getAudioUrl]);

  // Persist the position when leaving the page (playback itself continues)
  useEffect(() => () => { saveResume(); }, [saveResume]);


  const handlePlayPause = () => {
    if (isPlaying) {
      engine.pause();
      pausedRef.current = true;
      setWantsPlay(false);
      saveResume(); // exact position at the moment of pause
    } else {
      setCompleted(false);
      setWantsPlay(true);
      saveProgress({ lastDashakam: currentDashakam, lastPage: "/podcast" });
    }
  };


  const handleNext = useCallback(() => {
    playSessionRef.current += 1; releaseAudio();
    pausedRef.current = false;
    setCurrentLoop(0);
    setCompleted(false);
    if (inPlaylistMode) {
      const nextIdx = playlistIndex + 1;
      if (nextIdx < playlistItems!.length) {
        setPlaylistIndex(nextIdx);
        setPlaylistLoop(0);
        setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
      }
    } else {
      const idx = publishedList.findIndex((d) => d.dashakam_no === currentDashakam);
      if (idx >= 0 && idx < publishedList.length - 1) {
        setCurrentDashakam(publishedList[idx + 1].dashakam_no);
      }
    }
  }, [currentDashakam, inPlaylistMode, playlistItems, playlistIndex, publishedList]);

  const handlePrev = () => {
    playSessionRef.current += 1; releaseAudio();
    pausedRef.current = false;
    setCurrentLoop(0);
    setCompleted(false);
    if (inPlaylistMode) {
      if (playlistIndex > 0) {
        const newIdx = playlistIndex - 1;
        setPlaylistIndex(newIdx);
        setPlaylistLoop(0);
        setCurrentDashakam(playlistItems![newIdx].dashakam_no);
      }
    } else {
      const idx = publishedList.findIndex((d) => d.dashakam_no === currentDashakam);
      if (idx > 0) {
        setCurrentDashakam(publishedList[idx - 1].dashakam_no);
      }
    }
  };

  const handleSeek = (value: number[]) => {
    engine.seek(value[0]);
  };


  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const playModes: { value: PlayMode; label: string; desc: string }[] = [
    { value: "single", label: "Single Dashakam", desc: "Play one dashakam" },
    { value: "playlist", label: "Custom Playlist", desc: "Use your playlist" },
    { value: "all", label: "All 100", desc: "Play all sequentially" },
  ];

  // Build dropdown list — only published dashakams
  const dashakamDropdown = publishedList.map((d) => {
    const hasPodcast = publishedPodcastData.some((p) => p.dashakam === d.dashakam_no);
    return { id: d.dashakam_no, title: d.dashakam_name, titleSanskrit: "", hasPodcast };
  });

  return (
    <div className="container mx-auto px-4 py-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <SEO path="/listen" title="Listen — Sriman Narayaneeyam" description="Listen to a Dashakam or create your own playlist — devotional audio of the sacred Narayaneeyam." />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Listen</h1>
            <p className="text-muted-foreground font-sans">
              Listen to a Dashakam or create your own playlist. Audio continues playing even when the app is minimized.
            </p>
          </div>
          <button
            onClick={() => setPlaylistBuilderOpen(true)}
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
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setCurrentLoop(0);
                playSessionRef.current += 1; releaseAudio();
                pausedRef.current = false;
              }
            }}
            onNextDashakam={() => {
              if (playlistIndex < playlistItems!.length - 1) {
                const newIdx = playlistIndex + 1;
                setPlaylistIndex(newIdx); setPlaylistLoop(0);
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setCurrentLoop(0);
                playSessionRef.current += 1; releaseAudio();
                pausedRef.current = false;
              }
            }}
            onSkipLoop={() => {
              setPlaylistLoop(0);
              const nextIdx = playlistIndex + 1;
              if (nextIdx < playlistItems!.length) {
                setPlaylistIndex(nextIdx);
                setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
                setCurrentLoop(0);
                playSessionRef.current += 1; releaseAudio();
                pausedRef.current = false;
              }
            }}
            onExit={exitPlaylist}
          />
        )}

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          {playModes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => {
                if (mode.value === "playlist") {
                  setPlaylistBuilderOpen(true);
                } else {
                  setPlayMode(mode.value);
                  playSessionRef.current += 1; releaseAudio();
                  pausedRef.current = false;
                  setWantsPlay(false);
                  setCurrentLoop(0);
                  setCompleted(false);
                }
              }}
              className={`flex-1 rounded-xl border p-4 text-center transition-all ${
                playMode === mode.value
                  ? "border-secondary bg-secondary/10 shadow-gold"
                  : "border-border bg-card hover:bg-muted"
              }`}
            >
              <p className={`text-sm font-sans font-semibold ${playMode === mode.value ? "text-secondary" : "text-foreground"}`}>
                {mode.label}
              </p>
              <p className="text-xs text-muted-foreground font-sans mt-1">{mode.desc}</p>
            </button>
          ))}
        </div>

        {/* Dashakam Selector (for single mode) */}
        {playMode === "single" && !inPlaylistMode && (
          <div className="mb-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-sans">Select Dashakam</label>
              <select
                value={currentDashakam}
                onChange={(e) => {
                  playSessionRef.current += 1; releaseAudio();
                  pausedRef.current = false;
                  setCurrentDashakam(Number(e.target.value));
                  setCurrentLoop(0); setCompleted(false);
                }}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
              >
                {dashakamDropdown.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}. {d.title} {d.hasPodcast ? "🎧" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Now Playing */}
        <div className="rounded-xl bg-gradient-peacock p-6 mb-6">
          <div className="text-center mb-6">
            {isPlaying && (
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                </span>
                <span className="text-xs font-sans font-semibold text-secondary uppercase tracking-wider">Listening Now</span>
              </div>
            )}
            <p className="text-xs text-gold-light font-sans uppercase tracking-wide mb-1">Now Playing</p>
            <h2 className="font-display text-2xl font-semibold text-primary-foreground">
              Dashakam {currentDashakam}
            </h2>
            <p className="text-gold-light font-sans text-sm mt-1">{dashakamName}</p>
            {remarksMap[currentDashakam] && (
              <p className="text-primary-foreground/70 font-sans text-xs mt-1 max-w-xl mx-auto">
                {remarksMap[currentDashakam]}
              </p>
            )}
            {playMode === "all" && (
              <p className="text-gold-light font-sans text-xs mt-2">
                📻 Playing all 100 dashakams · {currentDashakam}/100
              </p>
            )}
            {inPlaylistMode && (
              <p className="text-gold-light font-sans text-xs mt-2">
                📋 Playlist · Dashakam {playlistIndex + 1}/{playlistItems!.length}
                {(playlistItems![playlistIndex]?.loops ?? 1) > 1 && ` · Loop ${playlistLoop + 1}/${playlistItems![playlistIndex].loops}`}
              </p>
            )}
            {playMode === "single" && loopCount > 1 && (
              <p className="text-gold-light font-sans text-xs mt-2">
                🔁 Loop {currentLoop + 1}/{loopCount}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4 px-2">
            <Slider value={[progress]} onValueChange={handleSeek} max={100} step={0.5} className="w-full" />
            <div className="flex justify-between mt-1 text-xs text-primary-foreground/50 font-sans">
              <span>{formatTime(elapsed)}</span>
              <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={handlePrev} className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors">
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              onClick={handlePlayPause}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110"
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
            </button>
            <button onClick={handleNext} className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors">
              <SkipForward className="h-6 w-6" />
            </button>
          </div>

          {/* Speed + Loop Controls */}
          <div className="flex justify-center gap-3 mt-4">
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-primary-foreground/50 font-sans">Speed</label>
              <select
                value={speed}
                onChange={(e) => {
                  const s = Number(e.target.value);
                  setSpeed(s);
                  engine.setSpeed(s);
                  persistPodcastSpeed(s);
                }}

                className="rounded-lg bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 text-xs font-sans border border-primary-foreground/20 appearance-none cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
              >
                <option value={0.6}>0.6×</option>
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </div>
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-primary-foreground/50 font-sans">Sound</label>
              <button
                onClick={toggleMuted}
                aria-label={muted ? "Unmute audio" : "Mute audio"}
                title={muted ? "Unmute audio" : "Mute audio"}
                className={`rounded-lg px-3 py-1.5 text-xs font-sans border border-primary-foreground/20 transition-colors ${muted ? "bg-secondary text-secondary-foreground" : "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"}`}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
            {playMode === "single" && !inPlaylistMode && (
              <div className="flex flex-col items-center gap-1">
                <label className="text-[10px] text-primary-foreground/50 font-sans">Loop</label>
                <select
                  value={loopCount}
                  onChange={(e) => setLoopCount(Number(e.target.value))}
                  className="rounded-lg bg-primary-foreground/20 text-primary-foreground px-3 py-1.5 text-xs font-sans border border-primary-foreground/20 appearance-none cursor-pointer [&>option]:bg-card [&>option]:text-foreground"
                >
                  {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}×</option>))}
                </select>
              </div>
            )}
          </div>

          {/* Next dashakam preview */}
          {currentDashakam < 100 && (playMode === "all" || inPlaylistMode) && (
            <div className="mt-4 text-center">
              <p className="text-[10px] text-primary-foreground/40 font-sans">
                Up next: Dashakam {currentDashakam + 1} — {nextDashakamName}
              </p>
            </div>
          )}

          {/* Status */}
          {audioUrl ? (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" /> Ready to play
            </p>
          ) : (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans">
              🎵 No audio available for this dashakam yet
            </p>
          )}

          {/* Completion message */}
          {completed && (
            <div className="mt-4 text-center">
              <p className="text-gold-light font-sans text-sm">🎉 Playback complete!</p>
            </div>
          )}
        </div>

        {/* All 100 progress bar */}
        {playMode === "all" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-sans">Overall Progress</p>
              <p className="text-xs text-muted-foreground font-sans">{currentDashakam}/100</p>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${currentDashakam}%` }} />
            </div>
          </div>
        )}

        {/* Dashakam List Toggle */}
        <button
          onClick={() => setShowDashakamList(!showDashakamList)}
          className="flex items-center gap-2 mb-4 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
        >
          <ListMusic className="h-4 w-4" />
          {showDashakamList ? "Hide Dashakam List" : "Show Dashakam List (100 Dashakams)"}
        </button>

        {/* Dashakam List */}
        {showDashakamList && (
          <div className="rounded-xl border border-border bg-card max-h-96 overflow-y-auto">
            {dashakamDropdown.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  playSessionRef.current += 1; releaseAudio();
                  pausedRef.current = false;
                  setCurrentDashakam(d.id);
                  setCurrentLoop(0); setCompleted(false);
                  saveProgress({ lastDashakam: d.id, lastPage: "/podcast" });
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-sans border-b border-border last:border-b-0 transition-colors ${
                  d.id === currentDashakam
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="w-8 text-right text-xs text-muted-foreground">{d.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{d.title} {d.hasPodcast ? "🎧" : ""}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.titleSanskrit}</p>
                </div>
                {d.id === currentDashakam && isPlaying && (
                  <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <PlaylistBuilder
        mode="podcast"
        open={playlistBuilderOpen}
        onClose={() => setPlaylistBuilderOpen(false)}
        onStartPlaylist={handleStartPlaylist}
      />
    </div>
  );
}
