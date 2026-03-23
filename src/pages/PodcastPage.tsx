import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Repeat, ListMusic, Volume2 } from "lucide-react";
import { sampleDashakams, verseShouldShowBell } from "@/data/narayaneeyam";
import { getProgress, saveProgress } from "@/lib/progress";
import { playBellAudio, stopBellAudio } from "@/lib/bellAudio";
import { Slider } from "@/components/ui/slider";
import PlaylistBuilder from "@/components/PlaylistBuilder";
import PlaylistBar from "@/components/PlaylistBar";
import { usePlaylist, type PlaylistItem } from "@/hooks/usePlaylist";

type PlayMode = "single" | "loop" | "all" | "continue";

export default function PodcastPage() {
  const [currentDashakam, setCurrentDashakam] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [progress, setProgress] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef(false);
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Playlist state ──
  const [playlistBuilderOpen, setPlaylistBuilderOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProg } = usePlaylist("podcast");

  const inPlaylistMode = playlistItems !== null && playlistItems.length > 0;

  const handleStartPlaylist = (items: PlaylistItem[], plId?: string, resumeIdx?: number, resumeVerse?: number, resumeLoop?: number) => {
    setPlaylistItems(items);
    setPlaylistId(plId);
    const idx = resumeIdx ?? 0;
    setPlaylistIndex(idx);
    setPlaylistLoop(resumeLoop ?? 0);
    setCurrentDashakam(items[idx].dashakam_no);
    setCurrentVerseIdx(resumeVerse ?? 0);
    setCurrentLoop(0);
    setProgress(0);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pausedRef.current = false;
  };

  const exitPlaylist = () => {
    setPlaylistItems(null);
    setPlaylistIndex(0);
    setPlaylistLoop(0);
    setPlaylistId(undefined);
  };

  // Restore last position
  useEffect(() => {
    const saved = getProgress();
    if (saved.podcastState) {
      setCurrentDashakam(saved.podcastState.dashakam);
      setCurrentVerseIdx(saved.podcastState.verseIdx);
      setPlayMode(saved.podcastState.playMode as PlayMode);
    } else if (saved.lastDashakam) {
      setCurrentDashakam(saved.lastDashakam);
    }
  }, []);

  // Save position on changes
  useEffect(() => {
    saveProgress({
      lastDashakam: currentDashakam,
      lastPage: "/podcast",
      podcastState: { dashakam: currentDashakam, verseIdx: currentVerseIdx, playMode },
    });
  }, [currentDashakam, currentVerseIdx, playMode]);

  // Cleanup gap timer
  useEffect(() => {
    return () => { if (gapTimerRef.current) clearTimeout(gapTimerRef.current); };
  }, []);

  const dashakam = sampleDashakams.find((d) => d.id === currentDashakam);
  const audioVerses = dashakam?.verses.filter((v) => v.audio) || [];
  const hasAudio = audioVerses.length > 0;

  // Play bell if verse has bell=true, then advance
  const playBellThenAdvance = useCallback(async (nextAction: () => void) => {
    const currentVerse = audioVerses[currentVerseIdx];
    if (currentVerse && dashakam && verseShouldShowBell(dashakam, currentVerse.paragraph)) {
      await playBellAudio();
    }
    nextAction();
  }, [currentVerseIdx, audioVerses, dashakam]);

  const advanceToNextVerse = useCallback(() => {
    const nextIdx = currentVerseIdx + 1;
    if (nextIdx >= audioVerses.length) {
      // Done with all verses in this dashakam
      const nextLoop = currentLoop + 1;
      if (nextLoop < loopCount) {
        // Play bell for last verse, then restart loop
        playBellThenAdvance(() => {
          setCurrentLoop(nextLoop);
          setCurrentVerseIdx(0);
          setProgress(0);
        });
      } else if (playMode === "loop") {
        playBellThenAdvance(() => {
          setCurrentLoop(0);
          setCurrentVerseIdx(0);
          setProgress(0);
        });
      } else if (playMode === "all" || playMode === "continue") {
        playBellThenAdvance(() => {
          if (currentDashakam < 100) {
            setCurrentDashakam((prev) => prev + 1);
            setCurrentVerseIdx(0);
            setCurrentLoop(0);
            setProgress(0);
          } else {
            setIsPlaying(false);
          }
        });
      } else {
        playBellThenAdvance(() => {
          setIsPlaying(false);
          setProgress(100);
          setCurrentLoop(0);
        });
      }
    } else {
      // Bell for current verse, then 1.5s gap, then next verse
      playBellThenAdvance(() => {
        gapTimerRef.current = setTimeout(() => {
          setCurrentVerseIdx(nextIdx);
        }, 1500);
      });
    }
  }, [currentVerseIdx, audioVerses.length, playMode, currentDashakam, loopCount, currentLoop, playBellThenAdvance]);

  // Real audio playback
  useEffect(() => {
    if (!isPlaying || !dashakam) return;

    if (hasAudio) {
      if (currentVerseIdx >= audioVerses.length) {
        advanceToNextVerse();
        return;
      }

      // Resume paused audio
      if (pausedRef.current && audioRef.current && !audioRef.current.ended) {
        audioRef.current.playbackRate = speed;
        audioRef.current.play().catch((err) => console.error("Audio play error:", err));
        pausedRef.current = false;
        const audio = audioRef.current;
        const updateProgress = () => {
          if (audio.duration) {
            setElapsed(audio.currentTime);
            setDuration(audio.duration);
            setProgress((audio.currentTime / audio.duration) * (100 / audioVerses.length) + (currentVerseIdx / audioVerses.length) * 100);
          }
        };
        audio.addEventListener("timeupdate", updateProgress);
        audio.onended = () => advanceToNextVerse();
        return () => { audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
      }

      const audioUrl = audioVerses[currentVerseIdx].audio!;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = speed;
      pausedRef.current = false;
      audio.play().catch((err) => console.error("Audio play error:", err));

      const updateProgress = () => {
        if (audio.duration) {
          setElapsed(audio.currentTime);
          setDuration(audio.duration);
          setProgress((audio.currentTime / audio.duration) * (100 / audioVerses.length) + (currentVerseIdx / audioVerses.length) * 100);
        }
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => advanceToNextVerse();
      return () => { audio.pause(); audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    } else {
      // Simulated playback fallback
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.5;
        });
      }, 200);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [isPlaying, currentDashakam, currentVerseIdx, playMode, hasAudio, speed, advanceToNextVerse]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        pausedRef.current = true;
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      saveProgress({ lastDashakam: currentDashakam, lastPage: "/podcast" });
    }
  };

  const handleNext = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopBellAudio();
    pausedRef.current = false;
    setProgress(0);
    setCurrentVerseIdx(0);
    setCurrentLoop(0);
    if (playMode === "loop") return;
    if (currentDashakam < 100) {
      setCurrentDashakam((prev) => prev + 1);
      saveProgress({ lastDashakam: currentDashakam + 1, lastPage: "/podcast" });
    } else if (playMode === "all") {
      setCurrentDashakam(1);
    } else {
      setIsPlaying(false);
    }
  }, [currentDashakam, playMode]);

  const handlePrev = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    stopBellAudio();
    pausedRef.current = false;
    setProgress(0);
    setCurrentVerseIdx(0);
    setCurrentLoop(0);
    if (currentDashakam > 1) {
      setCurrentDashakam((prev) => prev - 1);
      saveProgress({ lastDashakam: currentDashakam - 1, lastPage: "/podcast" });
    }
  };

  const handleSeek = (value: number[]) => {
    const seekTo = value[0];
    if (hasAudio && audioRef.current && audioRef.current.duration) {
      const verseIdx = Math.floor((seekTo / 100) * audioVerses.length);
      const withinVerse = ((seekTo / 100) * audioVerses.length - verseIdx);
      if (verseIdx !== currentVerseIdx && verseIdx < audioVerses.length) {
        if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
        pausedRef.current = false;
        setCurrentVerseIdx(verseIdx);
      } else if (audioRef.current.duration) {
        audioRef.current.currentTime = withinVerse * audioRef.current.duration;
      }
    }
    setProgress(seekTo);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const playModes: { value: PlayMode; label: string }[] = [
    { value: "single", label: "Single" },
    { value: "loop", label: "Loop Dashakam" },
    { value: "all", label: "All 100" },
    { value: "continue", label: "Continue from here" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 select-none" onContextMenu={(e) => e.preventDefault()}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Podcast</h1>
            <p className="text-muted-foreground font-sans">
              Listen to Dashakams — plays in background even when app is minimized
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
                setPlaylistIndex(newIdx);
                setPlaylistLoop(0);
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setCurrentVerseIdx(0);
                setCurrentLoop(0);
                setProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false;
              }
            }}
            onNextDashakam={() => {
              if (playlistIndex < playlistItems!.length - 1) {
                const newIdx = playlistIndex + 1;
                setPlaylistIndex(newIdx);
                setPlaylistLoop(0);
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setCurrentVerseIdx(0);
                setCurrentLoop(0);
                setProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false;
              }
            }}
            onSkipLoop={() => {
              setPlaylistLoop(0);
              const nextIdx = playlistIndex + 1;
              if (nextIdx < playlistItems!.length) {
                setPlaylistIndex(nextIdx);
                setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
                setCurrentVerseIdx(0);
                setCurrentLoop(0);
                setProgress(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false;
              }
            }}
            onExit={exitPlaylist}
          />
        )}

        {/* Now Playing */}
        <div className="rounded-xl bg-gradient-peacock p-6 mb-6">
          <div className="text-center mb-6">
            <p className="text-xs text-gold-light font-sans uppercase tracking-wide mb-1">Now Playing</p>
            <h2 className="font-display text-2xl font-semibold text-primary-foreground">
              Dashakam {currentDashakam}
            </h2>
            {dashakam && (
              <>
                <p className="text-gold-light font-sans text-sm mt-1">{dashakam.title_english}</p>
                <p className="text-primary-foreground/60 font-sans text-xs mt-1">{dashakam.title_sanskrit}</p>
              </>
            )}
            {hasAudio && (
              <p className="text-gold-light font-sans text-lg font-semibold mt-3">
                Verse {currentVerseIdx + 1}
              </p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4 px-2">
            <Slider
              value={[progress]}
              onValueChange={handleSeek}
              max={100}
              step={0.5}
              className="w-full"
            />
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
                  if (audioRef.current) audioRef.current.playbackRate = s;
                }}
                className="rounded-lg bg-primary-foreground/10 text-primary-foreground px-2 py-1 text-xs font-sans border-none"
              >
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
              </select>
            </div>
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-primary-foreground/50 font-sans">Loop</label>
              <select
                value={loopCount}
                onChange={(e) => setLoopCount(Number(e.target.value))}
                className="rounded-lg bg-primary-foreground/10 text-primary-foreground px-2 py-1 text-xs font-sans border-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (<option key={n} value={n}>{n}×</option>))}
              </select>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex justify-center gap-2 mt-4">
            {playModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setPlayMode(mode.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-sans transition-colors ${
                  playMode === mode.value
                    ? "bg-gold-dark text-primary-foreground"
                    : "bg-primary-foreground/10 text-primary-foreground/60 hover:text-primary-foreground"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {hasAudio ? (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans">
              🎵 Verse {currentVerseIdx + 1} of {audioVerses.length}
              {loopCount > 1 && ` · Loop ${currentLoop + 1}/${loopCount}`}
            </p>
          ) : (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans">
              🎵 Audio playback is simulated — upload MP3 files to enable real playback
            </p>
          )}
        </div>

        {/* Playlist Toggle */}
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className="flex items-center gap-2 mb-4 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
        >
          <ListMusic className="h-4 w-4" />
          {showPlaylist ? "Hide Playlist" : "Show Playlist (100 Dashakams)"}
        </button>

        {/* Playlist */}
        {showPlaylist && (
          <div className="rounded-xl border border-border bg-card max-h-96 overflow-y-auto">
            {sampleDashakams.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  stopBellAudio();
                  pausedRef.current = false;
                  setCurrentDashakam(d.id);
                  setProgress(0);
                  setCurrentVerseIdx(0);
                  setCurrentLoop(0);
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
                  <p className="truncate">{d.title_english}</p>
                  <p className="text-xs text-muted-foreground truncate">{d.title_sanskrit}</p>
                </div>
                {d.id === currentDashakam && isPlaying && (
                  <Volume2 className="h-4 w-4 text-primary animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
