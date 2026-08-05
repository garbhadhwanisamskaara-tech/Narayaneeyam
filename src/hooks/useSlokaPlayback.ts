import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playBellAudio } from "@/lib/bellAudio";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement } from "@/lib/globalMute";

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
    onComplete: () => void,
    playBell?: boolean
  ) => void;
  /** Stop any in-progress sloka playback */
  stopSloka: () => void;
}

export function useSlokaPlayback(): UseSlokaPlaybackReturn {
  const [activeSlokaScript, setActiveSlokaScript] = useState<string | null>(null);
  const [activeSlokaTranslation, setActiveSlokaTranslation] = useState<string | null>(null);
  const [isSlokaPlaying, setIsSlokaPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unregisterRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);
  /** Monotonic id of the current sloka playback session. */
  const sessionRef = useRef(0);

  /** Detach handlers, unregister from the global mute set and drop the element. */
  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onpause = null;
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
    unregisterRef.current?.();
    unregisterRef.current = null;
  }, []);

  const stopSloka = useCallback(() => {
    cancelledRef.current = true;
    sessionRef.current += 1;
    releaseAudio();
    setActiveSlokaScript(null);
    setActiveSlokaTranslation(null);
    setIsSlokaPlaying(false);
  }, [releaseAudio]);

  // Never leave a temporary element registered when the hook goes away
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      sessionRef.current += 1;
      releaseAudio();
    };
  }, [releaseAudio]);


  const handlePostVerse = useCallback(
    async (
      slokaAudioId: string | null,
      languageCode: string,
      mode: "chant" | "learn",
      speed: number,
      onComplete: () => void,
      playBell = false
    ) => {
      if (!slokaAudioId) {
        if (playBell) {
          cancelledRef.current = false;
          await playBellAudio();
        }
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

        const resolvedAudioFile = getStorageUrl(audioFile);

        const finish = async (withBell: boolean) => {
          if (cancelledRef.current) return;
          // Bell only for verses that have a Prasadam entry
          if (withBell) {
            await playBellAudio();
            if (cancelledRef.current) return;
          }
          setActiveSlokaScript(null);
          setActiveSlokaTranslation(null);
          setIsSlokaPlaying(false);
          onComplete();
        };

        if (resolvedAudioFile && !cancelledRef.current) {
          const audio = new Audio(resolvedAudioFile);
          audioRef.current = audio;
          registerAudioElement(audio);
          audio.defaultPlaybackRate = speed;
          audio.playbackRate = speed;
          audio.addEventListener("loadedmetadata", () => { audio.playbackRate = speed; });

          audio.onended = () => void finish(playBell);

          // Missing/broken audio — don't stall, move on immediately
          audio.onerror = () => void finish(false);

          audio.play().catch(() => void finish(false));
        } else {
          // No sloka audio file — continue immediately, no waiting
          void finish(playBell);
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
