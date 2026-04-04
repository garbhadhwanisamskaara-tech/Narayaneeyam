import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playBellAudio } from "@/lib/bellAudio";
import { getStorageUrl } from "@/lib/storageUrl";

export interface SlokaData {
  sloka_audio_id: string;
  script_text: string;
  translation_text: string;
  chant_audio_file: string;
  learn_audio_file: string;
}

interface UseSlokaPlaybackReturn {
  /** Currently displayed sloka script (null = not showing) */
  activeSlokaScript: string | null;
  activeSlokaTranslation: string | null;
  /** Whether sloka audio is currently playing */
  isSlokaPlaying: boolean;
  /**
   * Called after verse audio ends. Checks sloka_audio_id,
   * fetches sloka data, plays sloka audio + bell, then calls onComplete.
   * If no sloka, calls onComplete immediately.
   */
  handlePostVerse: (
    slokaAudioId: string | null,
    languageCode: string,
    mode: "chant" | "learn",
    speed: number,
    onComplete: () => void
  ) => void;
  /** Stop any in-progress sloka playback */
  stopSloka: () => void;
}

export function useSlokaPlayback(): UseSlokaPlaybackReturn {
  const [activeSlokaScript, setActiveSlokaScript] = useState<string | null>(null);
  const [activeSlokaTranslation, setActiveSlokaTranslation] = useState<string | null>(null);
  const [isSlokaPlaying, setIsSlokaPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cancelledRef = useRef(false);

  const stopSloka = useCallback(() => {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setActiveSlokaScript(null);
    setActiveSlokaTranslation(null);
    setIsSlokaPlaying(false);
  }, []);

  const handlePostVerse = useCallback(
    async (
      slokaAudioId: string | null,
      languageCode: string,
      mode: "chant" | "learn",
      speed: number,
      onComplete: () => void
    ) => {
      if (!slokaAudioId) {
        onComplete();
        return;
      }

      cancelledRef.current = false;
      setIsSlokaPlaying(true);

      try {
        // Fetch sloka script and audio in parallel
        const [scriptRes, audioRes] = await Promise.all([
          supabase
            .from("sloka_scripts")
            .select("script_text, translation_text")
            .eq("sloka_audio_id", slokaAudioId)
            .eq("language_code", languageCode)
            .limit(1)
            .single(),
          supabase
            .from("sloka_audio")
            .select("chant_audio_file, learn_audio_file")
            .eq("sloka_audio_id", slokaAudioId)
            .limit(1)
            .single(),
        ]);

        if (cancelledRef.current) return;

        // Display script on screen
        const script = scriptRes.data;
        if (script) {
          setActiveSlokaScript(script.script_text || "");
          setActiveSlokaTranslation(script.translation_text || "");
        }

        // Play sloka audio
        const audioData = audioRes.data;
        const audioFile =
          mode === "learn"
            ? audioData?.learn_audio_file
            : audioData?.chant_audio_file;

        if (audioFile && !cancelledRef.current) {
          const audio = new Audio(audioFile);
          audioRef.current = audio;
          audio.playbackRate = speed;

          audio.onended = async () => {
            if (cancelledRef.current) return;
            // Play bell after sloka audio ends
            await playBellAudio();
            if (cancelledRef.current) return;
            setActiveSlokaScript(null);
            setActiveSlokaTranslation(null);
            setIsSlokaPlaying(false);
            onComplete();
          };

          audio.onerror = () => {
            if (cancelledRef.current) return;
            setActiveSlokaScript(null);
            setActiveSlokaTranslation(null);
            setIsSlokaPlaying(false);
            onComplete();
          };

          audio.play().catch(() => {
            if (!cancelledRef.current) {
              setActiveSlokaScript(null);
              setActiveSlokaTranslation(null);
              setIsSlokaPlaying(false);
              onComplete();
            }
          });
        } else {
          // No audio file — still show script briefly, then continue
          if (!cancelledRef.current) {
            setTimeout(() => {
              if (!cancelledRef.current) {
                setActiveSlokaScript(null);
                setActiveSlokaTranslation(null);
                setIsSlokaPlaying(false);
                onComplete();
              }
            }, 2000);
          }
        }
      } catch {
        if (!cancelledRef.current) {
          setActiveSlokaScript(null);
          setActiveSlokaTranslation(null);
          setIsSlokaPlaying(false);
          onComplete();
        }
      }
    },
    []
  );

  return {
    activeSlokaScript,
    activeSlokaTranslation,
    isSlokaPlaying,
    handlePostVerse,
    stopSloka,
  };
}
