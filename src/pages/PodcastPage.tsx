import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Repeat, ListMusic, Volume2 } from "lucide-react";
import { sampleDashakams } from "@/data/narayaneeyam";
import { getProgress, saveProgress } from "@/lib/progress";

type PlayMode = "single" | "loop" | "all" | "continue";

export default function PodcastPage() {
  const [currentDashakam, setCurrentDashakam] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("single");
  const [progress, setProgress] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [currentVerseIdx, setCurrentVerseIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const saved = getProgress();
    if (saved.lastDashakam) setCurrentDashakam(saved.lastDashakam);
  }, []);

  const dashakam = sampleDashakams.find((d) => d.id === currentDashakam);
  const hasAudio = dashakam?.verses.some((v) => v.audio);

  // Real audio playback for dashakams with audio
  useEffect(() => {
    if (!isPlaying || !dashakam) return;

    if (hasAudio) {
      const verses = dashakam.verses.filter((v) => v.audio);
      if (currentVerseIdx >= verses.length) {
        // Done playing all verses
        setProgress(0);
        setCurrentVerseIdx(0);
        if (playMode === "loop") {
          // restart same dashakam
        } else if (currentDashakam < 100 && (playMode === "all" || playMode === "continue")) {
          setCurrentDashakam((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
        return;
      }
      const audioUrl = verses[currentVerseIdx].audio!;
      console.log("Playing audio:", audioUrl);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.play().catch((err) => console.error("Audio play error:", err));
      
      const updateProgress = () => {
        if (audio.duration) setProgress((audio.currentTime / audio.duration) * (100 / verses.length) + (currentVerseIdx / verses.length) * 100);
      };
      audio.addEventListener("timeupdate", updateProgress);
      audio.onended = () => setCurrentVerseIdx((prev) => prev + 1);
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
  }, [isPlaying, currentDashakam, currentVerseIdx, playMode, hasAudio]);

  const handleNext = useCallback(() => {
    setProgress(0);
    setCurrentVerseIdx(0);
    if (audioRef.current) audioRef.current.pause();
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
    setProgress(0);
    setCurrentVerseIdx(0);
    if (audioRef.current) audioRef.current.pause();
    if (currentDashakam > 1) {
      setCurrentDashakam((prev) => prev - 1);
      saveProgress({ lastDashakam: currentDashakam - 1, lastPage: "/podcast" });
    }
  };


  const playModes: { value: PlayMode; label: string }[] = [
    { value: "single", label: "Single" },
    { value: "loop", label: "Loop Dashakam" },
    { value: "all", label: "All 100" },
    { value: "continue", label: "Continue from here" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Podcast</h1>
          <p className="text-muted-foreground font-sans">
            Listen to Dashakams — plays in background even when app is minimized
          </p>
        </div>

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
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="h-1.5 rounded-full bg-primary-foreground/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-gold transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-primary-foreground/50 font-sans">
              <span>{Math.floor(progress * 0.06)}:{String(Math.floor((progress * 3.6) % 60)).padStart(2, "0")}</span>
              <span>~6:00</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={handlePrev} className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors">
              <SkipBack className="h-6 w-6" />
            </button>
            <button
              onClick={() => {
                if (isPlaying && audioRef.current) audioRef.current.pause();
                setIsPlaying(!isPlaying);
                if (!isPlaying) setCurrentVerseIdx(0);
                saveProgress({ lastDashakam: currentDashakam, lastPage: "/podcast" });
              }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-gold text-primary shadow-gold transition-transform hover:scale-110"
            >
              {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 ml-0.5" />}
            </button>
            <button onClick={handleNext} className="text-primary-foreground/70 hover:text-primary-foreground p-2 transition-colors">
              <SkipForward className="h-6 w-6" />
            </button>
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
              🎵 Real audio playback — Verse {currentVerseIdx + 1} of {dashakam?.verses.filter(v => v.audio).length}
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
                  if (audioRef.current) audioRef.current.pause();
                  setCurrentDashakam(d.id);
                  setProgress(0);
                  setCurrentVerseIdx(0);
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
