import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement } from "@/lib/globalMute";
import { fadeOutElement } from "@/lib/audioFade";

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
   * fetches sloka data, plays sloka audio, then calls onComplete.
   * If no sloka, calls onComplete immediately.
   */
  handlePostVerse: (
    slokaAudioId: string | null,
    languageCode: string,
    mode: "chant" | "learn",
    speed: number,
    onComplete: () => void,
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

  // True unmount only (navigating away from the Chant screen entirely) — fade
  // out over 2s instead of cutting off. stopSloka() (used for every in-page
  // transition) is untouched and stays instant.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      sessionRef.current += 1;
      const audio = audioRef.current;
      const unregister = unregisterRef.current;
      audioRef.current = null;
      unregisterRef.current = null;
      if (audio) {
        audio.onended = null;
        audio.onerror = null;
        audio.onpause = null;
        fadeOutElement(audio, 2000, () => {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          unregister?.();
        });
      }
    };
  }, []);

  const handlePostVerse = useCallback(
    async (
      slokaAudioId: string | null,
      languageCode: string,
      mode: "chant" | "learn",
      speed: number,
      onComplete: () => void,
    ) => {
      // Each invocation owns a session id; stale events can never touch the UI
      sessionRef.current += 1;
      const session = sessionRef.current;
      const isStale = () => cancelledRef.current || sessionRef.current !== session;

      if (!slokaAudioId) {
        cancelledRef.current = false;
        if (sessionRef.current !== session) return;
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

        if (isStale()) return;

        // Display script on screen
        const script = scriptRes.data;
        if (script) {
          setActiveSlokaScript(script.script_text || "");
          setActiveSlokaTranslation(script.translation_text || "");
        }

        // Play sloka audio
        const audioData = audioRes.data;
        const audioFile = mode === "learn" ? audioData?.learn_audio_file : audioData?.chant_audio_file;

        const resolvedAudioFile = getStorageUrl(audioFile);

        // Guarded completion: only ever runs once per session, no matter how many
        // completion paths (ended / error / rejected play / stop) fire.
        let finished = false;
        const finishOnce = () => {
          if (finished) return;
          finished = true;
          releaseAudio();
          if (isStale()) return;
          setActiveSlokaScript(null);
          setActiveSlokaTranslation(null);
          setIsSlokaPlaying(false);
          onComplete();
        };

        if (resolvedAudioFile && !isStale()) {
          const audio = new Audio(resolvedAudioFile);
          releaseAudio(); // drop any previous temporary element first
          audioRef.current = audio;
          unregisterRef.current = registerAudioElement(audio);
          audio.defaultPlaybackRate = speed;
          audio.playbackRate = speed;
          const onLoadedMetadata = () => {
            audio.playbackRate = speed;
          };
          audio.addEventListener("loadedmetadata", onLoadedMetadata);

          audio.onended = () => {
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            finishOnce();
          };

          // Missing/broken audio — don't stall, move on immediately
          audio.onerror = () => {
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            finishOnce();
          };

          audio.play().catch(() => {
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            finishOnce();
          });
        } else {
          // No sloka audio file — continue immediately, no waiting
          finishOnce();
        }
      } catch {
        releaseAudio();
        if (!isStale()) {
          setActiveSlokaScript(null);
          setActiveSlokaTranslation(null);
          setIsSlokaPlaying(false);
          onComplete();
        }
      }
    },
    [releaseAudio],
  );

  return {
    activeSlokaScript,
    activeSlokaTranslation,
    isSlokaPlaying,
    handlePostVerse,
    stopSloka,
  };
}
