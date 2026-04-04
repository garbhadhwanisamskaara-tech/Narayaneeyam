import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, ListMusic, Volume2 } from "lucide-react";
import { sampleDashakams } from "@/data/narayaneeyam";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storageUrl";
import { getProgress, saveProgress } from "@/lib/progress";
import { Slider } from "@/components/ui/slider";
import PlaylistBuilder from "@/components/PlaylistBuilder";
import PlaylistBar from "@/components/PlaylistBar";
import { usePlaylist, type PlaylistItem } from "@/hooks/usePlaylist";

type PlayMode = "single" | "playlist" | "all";

interface PodcastEntry {
  dashakam: number;
  podcast_audio_file: string;
}

export default function PodcastPage() {
  const [currentDashakam, setCurrentDashakam] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [progress, setProgress] = useState(0);
  const [showDashakamList, setShowDashakamList] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loopCount, setLoopCount] = useState(1);
  const [currentLoop, setCurrentLoop] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [podcastData, setPodcastData] = useState<PodcastEntry[]>([]);
  const [completed, setCompleted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pausedRef = useRef(false);

  // ── Playlist state ──
  const [playlistBuilderOpen, setPlaylistBuilderOpen] = useState(false);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[] | null>(null);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [playlistLoop, setPlaylistLoop] = useState(0);
  const [playlistId, setPlaylistId] = useState<string | undefined>();
  const { saveProgress: savePlaylistProg } = usePlaylist("podcast");

  const inPlaylistMode = playlistItems !== null && playlistItems.length > 0;

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
    setProgress(0);
    setCompleted(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
    const entry = podcastData.find((p) => p.dashakam === dashakamNo);
    if (entry?.podcast_audio_file) return entry.podcast_audio_file;
    // Fallback: check static data for individual verse audio (not ideal for podcast)
    return null;
  }, [podcastData]);

  const dashakam = sampleDashakams.find((d) => d.id === currentDashakam);
  const audioUrl = getAudioUrl(currentDashakam);
  const nextDashakam = sampleDashakams.find((d) => d.id === currentDashakam + 1);

  // Advance to next dashakam
  const advanceToNext = useCallback(() => {
    if (inPlaylistMode) {
      const nextLoop = playlistLoop + 1;
      const maxLoops = playlistItems![playlistIndex]?.loops ?? 1;
      if (nextLoop < maxLoops) {
        setPlaylistLoop(nextLoop);
        setProgress(0);
        setElapsed(0);
        // Audio will restart via effect
      } else {
        setPlaylistLoop(0);
        const nextIdx = playlistIndex + 1;
        if (nextIdx < playlistItems!.length) {
          setPlaylistIndex(nextIdx);
          setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
          setProgress(0);
          setElapsed(0);
          if (playlistId) savePlaylistProg(playlistId, nextIdx, 0, 0);
        } else {
          setIsPlaying(false);
          setCompleted(true);
        }
      }
    } else if (playMode === "all") {
      if (currentDashakam < 100) {
        setCurrentDashakam((prev) => prev + 1);
        setProgress(0);
        setElapsed(0);
        setCurrentLoop(0);
      } else {
        setIsPlaying(false);
        setCompleted(true);
      }
    } else if (playMode === "single") {
      const nextLoop = currentLoop + 1;
      if (nextLoop < loopCount) {
        setCurrentLoop(nextLoop);
        setProgress(0);
        setElapsed(0);
      } else {
        setIsPlaying(false);
        setCompleted(true);
        setCurrentLoop(0);
      }
    }
  }, [inPlaylistMode, playlistItems, playlistIndex, playlistLoop, playlistId, playMode, currentDashakam, loopCount, currentLoop, savePlaylistProg]);

  // Audio playback
  useEffect(() => {
    if (!isPlaying) return;

    if (pausedRef.current && audioRef.current && !audioRef.current.ended) {
      audioRef.current.playbackRate = speed;
      audioRef.current.play().catch((err) => console.error("Audio play error:", err));
      pausedRef.current = false;
      const audio = audioRef.current;
      const updateProgress = () => {
        if (audio.duration) {
          setElapsed(audio.currentTime);
          setDuration(audio.duration);
          setProgress((audio.currentTime / audio.duration) * 100);
        }
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => advanceToNext();
      return () => { audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
    }

    const url = getAudioUrl(currentDashakam);
    if (!url) {
      // No audio available — simulate or skip
      setIsPlaying(false);
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.playbackRate = speed;
    pausedRef.current = false;
    audio.play().catch((err) => console.error("Audio play error:", err));

    const updateProgress = () => {
      if (audio.duration) {
        setElapsed(audio.currentTime);
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    audio.addEventListener("timeupdate", updateProgress);
    audio.onended = () => advanceToNext();
    return () => { audio.pause(); audio.removeEventListener("timeupdate", updateProgress); audio.onended = null; };
  }, [isPlaying, currentDashakam, speed, advanceToNext, currentLoop, playlistLoop, getAudioUrl]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (audioRef.current) { audioRef.current.pause(); pausedRef.current = true; }
      setIsPlaying(false);
    } else {
      setCompleted(false);
      setIsPlaying(true);
      saveProgress({ lastDashakam: currentDashakam, lastPage: "/podcast" });
    }
  };

  const handleNext = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pausedRef.current = false;
    setProgress(0);
    setElapsed(0);
    setCurrentLoop(0);
    setCompleted(false);
    if (inPlaylistMode) {
      const nextIdx = playlistIndex + 1;
      if (nextIdx < playlistItems!.length) {
        setPlaylistIndex(nextIdx);
        setPlaylistLoop(0);
        setCurrentDashakam(playlistItems![nextIdx].dashakam_no);
      }
    } else if (currentDashakam < 100) {
      setCurrentDashakam((prev) => prev + 1);
    }
  }, [currentDashakam, inPlaylistMode, playlistItems, playlistIndex]);

  const handlePrev = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    pausedRef.current = false;
    setProgress(0);
    setElapsed(0);
    setCurrentLoop(0);
    setCompleted(false);
    if (inPlaylistMode) {
      if (playlistIndex > 0) {
        const newIdx = playlistIndex - 1;
        setPlaylistIndex(newIdx);
        setPlaylistLoop(0);
        setCurrentDashakam(playlistItems![newIdx].dashakam_no);
      }
    } else if (currentDashakam > 1) {
      setCurrentDashakam((prev) => prev - 1);
    }
  };

  const handleSeek = (value: number[]) => {
    const seekTo = value[0];
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (seekTo / 100) * audioRef.current.duration;
    }
    setProgress(seekTo);
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

  // Build dropdown list with podcast availability
  const dashakamDropdown = sampleDashakams.map((d) => {
    const hasPodcast = podcastData.some((p) => p.dashakam === d.id);
    return { id: d.id, title: d.title_english, titleSanskrit: d.title_sanskrit, hasPodcast };
  });

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
                setPlaylistIndex(newIdx); setPlaylistLoop(0);
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setProgress(0); setElapsed(0); setCurrentLoop(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                pausedRef.current = false;
              }
            }}
            onNextDashakam={() => {
              if (playlistIndex < playlistItems!.length - 1) {
                const newIdx = playlistIndex + 1;
                setPlaylistIndex(newIdx); setPlaylistLoop(0);
                setCurrentDashakam(playlistItems![newIdx].dashakam_no);
                setProgress(0); setElapsed(0); setCurrentLoop(0);
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
                setProgress(0); setElapsed(0); setCurrentLoop(0);
                if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  pausedRef.current = false;
                  setIsPlaying(false);
                  setProgress(0);
                  setElapsed(0);
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
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  pausedRef.current = false;
                  setCurrentDashakam(Number(e.target.value));
                  setProgress(0); setElapsed(0); setCurrentLoop(0); setCompleted(false);
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
                  if (audioRef.current) audioRef.current.playbackRate = s;
                }}
                className="rounded-lg bg-primary-foreground/10 text-primary-foreground px-2 py-1 text-xs font-sans border-none"
              >
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </div>
            {playMode === "single" && !inPlaylistMode && (
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
            )}
          </div>

          {/* Next dashakam preview */}
          {nextDashakam && (playMode === "all" || inPlaylistMode) && (
            <div className="mt-4 text-center">
              <p className="text-[10px] text-primary-foreground/40 font-sans">
                Up next: Dashakam {nextDashakam.id} — {nextDashakam.title_english}
              </p>
            </div>
          )}

          {/* Status */}
          {audioUrl ? (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans flex items-center justify-center gap-1">
              <Volume2 className="h-3 w-3" /> Podcast audio ready
            </p>
          ) : (
            <p className="text-center text-xs text-primary-foreground/40 mt-4 font-sans">
              🎵 No podcast audio available for this dashakam yet
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
                  if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
                  pausedRef.current = false;
                  setCurrentDashakam(d.id);
                  setProgress(0); setElapsed(0); setCurrentLoop(0); setCompleted(false);
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
