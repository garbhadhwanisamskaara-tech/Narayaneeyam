import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Volume2 } from "lucide-react";
import type { RitualChant } from "@/hooks/useRitualChants";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement } from "@/lib/globalMute";
import { fadeOutElement } from "@/lib/audiofade";
import heroBg from "@/assets/hero-bg.jpg";

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
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.defaultPlaybackRate = speed;
      audioRef.current.playbackRate = speed;
    }
  }, [speed]);

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
      const unregisterMute = registerAudioElement(audio);
      audio.defaultPlaybackRate = speedRef.current;
      audio.playbackRate = speedRef.current;
      const onLoadedMetadata = () => {
        audio.playbackRate = speedRef.current;
      };
      audio.addEventListener("loadedmetadata", onLoadedMetadata);
      audio.onended = finishOnce;
      audio.onerror = finishOnce;
      audio.play().catch(() => finishOnce());

      const release = () => {
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        audio.removeEventListener("loadedmetadata", onLoadedMetadata);
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
          <span className="font-sans">Playing…</span>
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
