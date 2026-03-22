import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, Volume2 } from "lucide-react";
import type { RitualChant } from "@/hooks/useRitualChants";

interface Props {
  /** Array of chants to play in sequence */
  chants: RitualChant[];
  /** Use learn audio instead of chant audio */
  useLearnAudio?: boolean;
  /** Title shown at top of overlay */
  title: string;
  /** Called when all chants finish or user skips */
  onComplete: () => void;
  /** Playback speed */
  speed?: number;
}

export default function RitualChantOverlay({ chants, useLearnAudio = false, title, onComplete, speed = 1 }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const current = chants[currentIdx];

  const advance = useCallback(() => {
    if (currentIdx < chants.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      onComplete();
    }
  }, [currentIdx, chants.length, onComplete]);

  useEffect(() => {
    if (!current) { onComplete(); return; }

    const audioFile = useLearnAudio ? current.learn_audio_file : current.chant_audio_file;
    if (audioFile) {
      const audio = new Audio(audioFile);
      audioRef.current = audio;
      audio.playbackRate = speed;
      audio.play().catch(() => {});
      audio.onended = () => advance();
      return () => { audio.pause(); audio.onended = null; };
    } else {
      // No audio — show text for 4s then advance
      const t = setTimeout(advance, 4000);
      return () => clearTimeout(t);
    }
  }, [currentIdx, current, useLearnAudio, speed, advance]);

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
    >
      <div className="max-w-lg w-full text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-sans">{title}</p>
        <p className="text-sm text-muted-foreground font-sans">
          {currentIdx + 1} of {chants.length}
        </p>

        <div className="rounded-xl bg-gradient-peacock p-6 shadow-peacock">
          <p className="font-body text-lg text-primary-foreground leading-relaxed whitespace-pre-line">
            {current.transliteration_text || current.chant_key}
          </p>
          {current.translation_text && (
            <p className="mt-4 text-sm text-gold-light font-sans leading-relaxed">
              {current.translation_text}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span className="font-sans">Playing…</span>
        </div>

        <button
          onClick={() => {
            if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
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
