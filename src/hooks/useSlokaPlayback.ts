import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement } from "@/lib/globalMute";
import { fadeOutElement } from "@/lib/audiofade";

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
  /** Whether the sloka overlay is open */
  isSlokaOpen: boolean;
  slokaStatus: "playing" | "complete" | "unavailable" | null;
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
  const [isSlokaOpen, setIsSlokaOpen] = useState(false);
  const [slokaStatus, setSlokaStatus] = useState<"playing" | "complete" | "unavailable" | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unregisterRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);
  const activeSlokaIdRef = useRef<string | null>(null);
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
    if (activeSlokaIdRef.current) {
      console.info("[Sloka] cancelled", { id: activeSlokaIdRef.current, reason: "stopped" });
    }
    cancelledRef.current = true;
    sessionRef.current += 1;
    releaseAudio();
    activeSlokaIdRef.current = null;
    setActiveSlokaScript(null);
    setActiveSlokaTranslation(null);
    setIsSlokaPlaying(false);
    setIsSlokaOpen(false);
    setSlokaStatus(null);
  }, [releaseAudio]);

  // True unmount only (navigating away from the Chant screen entirely) — fade
  // out over 2s instead of cutting off. stopSloka() (used for every in-page
  // transition) is untouched and stays instant.
  useEffect(() => {
    return () => {
      if (activeSlokaIdRef.current) {
        console.info("[Sloka] cancelled", { id: activeSlokaIdRef.current, reason: "unmounted" });
      }
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

      console.info("[Sloka] start", { id: slokaAudioId, language: languageCode });
      cancelledRef.current = false;
      activeSlokaIdRef.current = slokaAudioId;
      setIsSlokaOpen(true);
      setIsSlokaPlaying(true);
      setSlokaStatus("playing");

      try {
        // Fetch sloka script and audio in parallel
        const [scriptRes, audioRes] = await Promise.all([
          supabase
            .from("sloka_scripts")
            .select("language_code, script_text, translation_text")
            .eq("sloka_audio_id", slokaAudioId)
            .in("language_code", [languageCode, "en"]),
          supabase
            .from("sloka_audio")
            .select("chant_audio_file, learn_audio_file, is_active")
            .eq("sloka_audio_id", slokaAudioId)
            .limit(1)
            .single(),
        ]);

        if (isStale()) {
          console.info("[Sloka] cancelled", { id: slokaAudioId, reason: "stale after fetch" });
          return;
        }

        const audioData = audioRes.data;
        if (audioData?.is_active === false) {
          console.info("[Sloka] cancelled", { id: slokaAudioId, reason: "inactive" });
          activeSlokaIdRef.current = null;
          setActiveSlokaScript(null);
          setActiveSlokaTranslation(null);
          setIsSlokaPlaying(false);
          setIsSlokaOpen(false);
          setSlokaStatus(null);
          onComplete();
          return;
        }

        // Display script on screen
        const scripts = scriptRes.data ?? [];
        const script = scripts.find((row) => row.language_code === languageCode)
          ?? scripts.find((row) => row.language_code === "en");
        if (script) {
          setActiveSlokaScript(script.script_text || "");
          setActiveSlokaTranslation(script.translation_text || "");
        }

        // Play sloka audio
        const audioFile = mode === "learn" ? audioData?.learn_audio_file : audioData?.chant_audio_file;

        const resolvedAudioFile = getStorageUrl(audioFile);
        console.info("[Sloka] resolved audio URL", { id: slokaAudioId, url: resolvedAudioFile });

        // Guarded completion: only ever runs once per session, no matter how many
        // completion paths (ended / error / rejected play / stop) fire.
        let finished = false;
        const finishOnce = (status: "complete" | "unavailable") => {
          if (finished) return;
          finished = true;
          releaseAudio();
          if (isStale()) {
            console.info("[Sloka] cancelled", { id: slokaAudioId, reason: "stale before completion" });
            return;
          }
          setIsSlokaPlaying(false);
          setSlokaStatus(status);
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
            console.info("[Sloka] audio ended", { id: slokaAudioId });
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            finishOnce("complete");
          };

          audio.onerror = () => {
            console.info("[Sloka] audio error", { id: slokaAudioId, url: resolvedAudioFile });
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            finishOnce("unavailable");
          };

          audio.play()
            .then(() => {
              console.info("[Sloka] audio started", { id: slokaAudioId });
            })
            .catch(() => {
              console.info("[Sloka] audio error", { id: slokaAudioId, url: resolvedAudioFile });
              audio.removeEventListener("loadedmetadata", onLoadedMetadata);
              finishOnce("unavailable");
            });
        } else {
          finishOnce("unavailable");
        }
      } catch (error) {
        console.info("[Sloka] audio error", { id: slokaAudioId, url: "", error });
        releaseAudio();
        if (!isStale()) {
          setIsSlokaPlaying(false);
          setSlokaStatus("unavailable");
        }
      }
    },
    [releaseAudio],
  );

  return {
    activeSlokaScript,
    activeSlokaTranslation,
    isSlokaPlaying,
    isSlokaOpen,
    slokaStatus,
    handlePostVerse,
    stopSloka,
  };
}
