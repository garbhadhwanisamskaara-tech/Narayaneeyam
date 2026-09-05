import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Volume2, VolumeX, Play, Pause, ScrollText } from "lucide-react";
import type { RitualChant } from "@/hooks/useRitualChants";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement, isMuted as getGlobalMuted, setGlobalMuted } from "@/lib/globalMute";
import { fadeOutElement } from "@/lib/audiofade";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import heroBg from "@/assets/hero-bg.jpg";

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

interface Props {
  /** Array of chants to play in sequence */
  chants: RitualChant[];
  /** Use learn audio instead of chant audio */
  useLearnAudio?: boolean;
  /** Title shown at top of overlay (fallback only) */
  title: string;
  /** Called when all chants finish or user skips */
  onComplete: () => void;
  /** Playback speed */
  speed?: number;
}

export default function RitualChantOverlay({ chants, useLearnAudio = false, title, onComplete, speed = 1 }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => getGlobalMuted());
  const [currentSpeed, setCurrentSpeed] = useState<number>(speed);
  const speedRef = useRef(speed);
  const mutedRef = useRef(muted);
  speedRef.current = currentSpeed;
  mutedRef.current = muted;

  // Keep element in sync when speed changes via prop or the speed control
  useEffect(() => {
    setCurrentSpeed(speed);
  }, [speed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = currentSpeed;
      audioRef.current.playbackRate = currentSpeed;
    }
  }, [currentSpeed]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      // Sync with the global mute so other surfaces respect the same state
      setGlobalMuted(next);
      if (audioRef.current) audioRef.current.muted = next;
      return next;
    });
  }, []);

  const cycleSpeed = useCallback(() => {
    setCurrentSpeed((prev) => {
      const idx = SPEED_OPTIONS.indexOf(prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    });
  }, []);

  const current = chants[currentIdx];

  // True-unmount marker: this effect's cleanup fires before the per-step
  // effect's below (hooks run cleanup in declaration order), so by the time
  // that one checks mountedRef, it already knows whether this is a real
  // unmount (navigate away) or just advancing to the next chant.
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const advance = useCallback(() => {
    if (currentIdx < chants.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      onComplete();
    }
  }, [currentIdx, chants.length, onComplete]);

  useEffect(() => {
    if (!current) {
      onComplete();
      return;
    }

    // One guarded completion per ritual step — ended / error / rejected play /
    // cleanup can all fire, but only the first one advances the sequence.
    let done = false;
    const finishOnce = () => {
      if (done) return;
      done = true;
      advance();
    };

    const rawFile = useLearnAudio ? current.learn_audio_file : current.chant_audio_file;
    const audioFile = getStorageUrl(rawFile);
    if (audioFile) {
      const audio = new Audio(audioFile);
      audioRef.current = audio;
      setIsPlaying(true);
      const unregisterMute = registerAudioElement(audio);
      audio.muted = mutedRef.current;
      audio.defaultPlaybackRate = speedRef.current;
      audio.playbackRate = speedRef.current;
      const onLoadedMetadata = () => {
        audio.playbackRate = speedRef.current;
      };
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      const onPlayEvent = () => setIsPlaying(true);
      const onPauseEvent = () => setIsPlaying(false);
      audio.addEventListener("play", onPlayEvent);
      audio.addEventListener("pause", onPauseEvent);
      audio.onended = finishOnce;
      audio.onerror = finishOnce;
      audio.play().catch(() => finishOnce());

      const release = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
        audio.removeEventListener("play", onPlayEvent);
        audio.removeEventListener("pause", onPauseEvent);
        audio.pause();
        unregisterMute();
        if (audioRef.current === audio) audioRef.current = null;
      };

      return () => {
        // Cleanup must never advance the sequence itself
        done = true;
        if (mountedRef.current) {
          // Normal step-to-step transition — hard stop immediately so the
          // next chant's audio never overlaps this one.
          release();
        } else {
          // True unmount (navigating away) — fade out over 2s instead of
          // cutting off abruptly.
          audio.removeEventListener("loadedmetadata", onLoadedMetadata);
          audio.onended = null;
          audio.onerror = null;
          if (audioRef.current === audio) audioRef.current = null;
          fadeOutElement(audio, 2000, () => {
            try {
              audio.pause();
            } catch {
              /* ignore */
            }
            unregisterMute();
          });
        }
      };
    } else {
      const t = setTimeout(finishOnce, 4000);
      return () => {
        done = true;
        clearTimeout(t);
      };
    }
  }, [currentIdx, current, useLearnAudio, advance, onComplete]);

  if (!current) return null;

  const displayName = current.ritual_chant_name || current.chant_key;
  const hasTransliteration = !!current.transliteration_text;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
    >
      <div className="max-w-lg w-full text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans">{displayName}</p>
        <p className="text-sm text-muted-foreground font-sans">
          {currentIdx + 1} of {chants.length}
        </p>

        <div className="rounded-xl bg-gradient-peacock p-6 shadow-peacock overflow-hidden relative">
          {hasTransliteration ? (
            <>
              <p className="font-body text-lg text-primary-foreground leading-relaxed whitespace-pre-line">
                {current.transliteration_text}
              </p>
              {current.translation_text && (
                <p className="mt-4 text-sm text-gold-light font-sans leading-relaxed">{current.translation_text}</p>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img
                src={heroBg}
                alt="Guruvayurappan"
                className="w-40 h-40 object-cover rounded-full border-2 border-gold-light/30"
              />
              {current.translation_text && (
                <p className="text-sm text-gold-light font-sans leading-relaxed">{current.translation_text}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span className="font-sans">{isPlaying ? "Playing…" : "Paused"}</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={cycleSpeed}
            aria-label="Change playback speed"
            className="inline-flex h-9 min-w-[3.25rem] items-center justify-center rounded-lg border border-border bg-card px-2 text-xs font-sans font-medium text-foreground hover:bg-muted transition-colors"
          >
            {currentSpeed}x
          </button>
        </div>

        <button
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
            }
            onComplete();
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-sans text-foreground hover:bg-muted transition-colors"
        >
          <SkipForward className="h-4 w-4" /> Skip
        </button>
      </div>
    </motion.div>
  );
}
