import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement } from "@/lib/globalMute";
import { fadeOutElement } from "@/lib/audiofade";

type SlokaStatus = "loading" | "playing" | "paused" | "complete" | "unavailable" | null;
export type SlokaLoopCount = 1 | 2 | 3 | 5 | "infinite";

interface UseSlokaPlaybackReturn {
  activeSlokaScript: string | null;
  activeSlokaTranslation: string | null;
  isSlokaTranslationEnglishFallback: boolean;
  isSlokaPlaying: boolean;
  isSlokaOpen: boolean;
  slokaStatus: SlokaStatus;
  slokaCurrentTime: number;
  slokaDuration: number;
  slokaSpeed: number;
  slokaLoopCount: SlokaLoopCount;
  hasSlokaAudio: boolean;
  handlePostVerse: (
    slokaAudioId: string | null,
    scriptLanguageCode: string,
    translationLanguageCode: string,
    speed: number,
    onComplete: () => void,
  ) => void;
  toggleSlokaPlayback: () => void;
  restartSloka: () => void;
  seekSloka: (seconds: number) => void;
  setSlokaSpeed: (speed: number) => void;
  setSlokaLoopCount: (count: SlokaLoopCount) => void;
  refreshSlokaTranslation: (translationLanguageCode: string) => void;
  stopSloka: () => void;
}

export function useSlokaPlayback(): UseSlokaPlaybackReturn {
  const [activeSlokaScript, setActiveSlokaScript] = useState<string | null>(null);
  const [activeSlokaTranslation, setActiveSlokaTranslation] = useState<string | null>(null);
  const [isSlokaTranslationEnglishFallback, setIsSlokaTranslationEnglishFallback] = useState(false);
  const [isSlokaPlaying, setIsSlokaPlaying] = useState(false);
  const [isSlokaOpen, setIsSlokaOpen] = useState(false);
  const [slokaStatus, setSlokaStatus] = useState<SlokaStatus>(null);
  const [slokaCurrentTime, setSlokaCurrentTime] = useState(0);
  const [slokaDuration, setSlokaDuration] = useState(0);
  const [slokaSpeed, setSlokaSpeedState] = useState(1);
  const [slokaLoopCount, setSlokaLoopCountState] = useState<SlokaLoopCount>(1);
  const [hasSlokaAudio, setHasSlokaAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unregisterRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);
  const activeSlokaIdRef = useRef<string | null>(null);
  const sessionRef = useRef(0);
  const completedLoopsRef = useRef(0);
  const loopCountRef = useRef<SlokaLoopCount>(1);
  const translationRequestRef = useRef(0);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onloadedmetadata = null;
      audio.ontimeupdate = null;
      audio.onplay = null;
      audio.onpause = null;
      audio.onended = null;
      audio.onerror = null;
      try {
        audio.pause();
      } catch {
        /* ignore */
      }
    }
    audioRef.current = null;
    setHasSlokaAudio(false);
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
    setIsSlokaTranslationEnglishFallback(false);
    setIsSlokaPlaying(false);
    setIsSlokaOpen(false);
    setSlokaStatus(null);
    setSlokaCurrentTime(0);
    setSlokaDuration(0);
  }, [releaseAudio]);

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
        audio.onloadedmetadata = null;
        audio.ontimeupdate = null;
        audio.onplay = null;
        audio.onpause = null;
        audio.onended = null;
        audio.onerror = null;
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

  const playCurrentAudio = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (slokaStatus === "complete") {
      completedLoopsRef.current = 0;
      audio.currentTime = 0;
      setSlokaCurrentTime(0);
    }
    setSlokaStatus("loading");
    try {
      await audio.play();
    } catch {
      setIsSlokaPlaying(false);
      setSlokaStatus("paused");
    }
  }, [slokaStatus]);

  const toggleSlokaPlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void playCurrentAudio();
    } else {
      audio.pause();
    }
  }, [playCurrentAudio]);

  const restartSloka = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    completedLoopsRef.current = 0;
    audio.currentTime = 0;
    setSlokaCurrentTime(0);
    void playCurrentAudio();
  }, [playCurrentAudio]);

  const seekSloka = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setSlokaCurrentTime(audio.currentTime);
  }, []);

  const setSlokaSpeed = useCallback((nextSpeed: number) => {
    setSlokaSpeedState(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  }, []);

  const setSlokaLoopCount = useCallback((count: SlokaLoopCount) => {
    loopCountRef.current = count;
    completedLoopsRef.current = 0;
    setSlokaLoopCountState(count);
  }, []);

  const refreshSlokaTranslation = useCallback(async (translationLanguageCode: string) => {
    const slokaAudioId = activeSlokaIdRef.current;
    if (!slokaAudioId) return;

    translationRequestRef.current += 1;
    const request = translationRequestRef.current;
    const { data } = await supabase
      .from("sloka_scripts")
      .select("language_code, translation_text")
      .eq("sloka_audio_id", slokaAudioId)
      .in("language_code", [translationLanguageCode, "en"]);

    if (request !== translationRequestRef.current || activeSlokaIdRef.current !== slokaAudioId) return;
    const rows = data ?? [];
    const preferredMeaning = rows.find(
      (row) => row.language_code === translationLanguageCode && row.translation_text?.trim(),
    );
    const englishMeaning = rows.find(
      (row) => row.language_code === "en" && row.translation_text?.trim(),
    );
    const meaning = preferredMeaning ?? englishMeaning;
    setActiveSlokaTranslation(meaning?.translation_text?.trim() || null);
    setIsSlokaTranslationEnglishFallback(
      translationLanguageCode !== "en" && !preferredMeaning && Boolean(englishMeaning),
    );
  }, []);

  const handlePostVerse = useCallback(
    async (
      slokaAudioId: string | null,
      scriptLanguageCode: string,
      translationLanguageCode: string,
      speed: number,
      onComplete: () => void,
    ) => {
      sessionRef.current += 1;
      const session = sessionRef.current;
      const isStale = () => cancelledRef.current || sessionRef.current !== session;

      if (!slokaAudioId) {
        cancelledRef.current = false;
        if (sessionRef.current === session) onComplete();
        return;
      }

      console.info("[Sloka] start", { id: slokaAudioId, language: scriptLanguageCode });
      cancelledRef.current = false;
      activeSlokaIdRef.current = slokaAudioId;
      completedLoopsRef.current = 0;
      loopCountRef.current = 1;
      setSlokaLoopCountState(1);
      setSlokaSpeedState(speed);
      setSlokaCurrentTime(0);
      setSlokaDuration(0);
      setIsSlokaOpen(true);
      setIsSlokaPlaying(false);
      setSlokaStatus("loading");

      try {
        const [scriptRes, audioRes] = await Promise.all([
          supabase
            .from("sloka_scripts")
            .select("language_code, script_text, translation_text")
            .eq("sloka_audio_id", slokaAudioId)
            .in("language_code", [scriptLanguageCode, translationLanguageCode, "en"]),
          supabase
            .from("sloka_audio")
            .select("chant_audio_file, is_active")
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
          stopSloka();
          onComplete();
          return;
        }

        const scripts = scriptRes.data ?? [];
        const script = scripts.find((row) => row.language_code === scriptLanguageCode)
          ?? scripts.find((row) => row.language_code === "en");
        const preferredMeaning = scripts.find(
          (row) => row.language_code === translationLanguageCode && row.translation_text?.trim(),
        );
        const englishMeaning = scripts.find(
          (row) => row.language_code === "en" && row.translation_text?.trim(),
        );
        const meaning = preferredMeaning ?? englishMeaning;
        setActiveSlokaScript(script?.script_text || "");
        setActiveSlokaTranslation(meaning?.translation_text?.trim() || null);
        setIsSlokaTranslationEnglishFallback(
          translationLanguageCode !== "en" && !preferredMeaning && Boolean(englishMeaning),
        );

        const resolvedAudioFile = getStorageUrl(audioData?.chant_audio_file);
        console.info("[Sloka] resolved audio URL", { id: slokaAudioId, url: resolvedAudioFile });

        if (!resolvedAudioFile || isStale()) {
          setSlokaStatus("unavailable");
          return;
        }

        releaseAudio();
        const audio = new Audio(resolvedAudioFile);
        audioRef.current = audio;
        setHasSlokaAudio(true);
        unregisterRef.current = registerAudioElement(audio);
        audio.defaultPlaybackRate = speed;
        audio.playbackRate = speed;

        audio.onloadedmetadata = () => {
          audio.playbackRate = speed;
          setSlokaDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
        };
        audio.ontimeupdate = () => setSlokaCurrentTime(audio.currentTime);
        audio.onplay = () => {
          setIsSlokaPlaying(true);
          setSlokaStatus("playing");
        };
        audio.onpause = () => {
          if (!audio.ended && !isStale()) {
            setIsSlokaPlaying(false);
            setSlokaStatus((current) => current === "unavailable" ? current : "paused");
          }
        };
        audio.onended = () => {
          console.info("[Sloka] audio ended", { id: slokaAudioId });
          completedLoopsRef.current += 1;
          const target = loopCountRef.current;
          if (!isStale() && (target === "infinite" || completedLoopsRef.current < target)) {
            audio.currentTime = 0;
            setSlokaCurrentTime(0);
            void audio.play().catch(() => {
              setIsSlokaPlaying(false);
              setSlokaStatus("paused");
            });
            return;
          }
          setIsSlokaPlaying(false);
          setSlokaCurrentTime(audio.duration || 0);
          setSlokaStatus("complete");
        };
        audio.onerror = () => {
          console.warn("[Sloka] audio error", {
            url: resolvedAudioFile,
            code: audio.error?.code,
            message: audio.error?.message,
          });
          console.info("[Sloka] audio error", { id: slokaAudioId, url: resolvedAudioFile });
          setIsSlokaPlaying(false);
          setSlokaStatus("unavailable");
        };

        try {
          await audio.play();
          if (!isStale()) console.info("[Sloka] audio started", { id: slokaAudioId });
        } catch {
          if (!isStale()) {
            setIsSlokaPlaying(false);
            setSlokaStatus("paused");
          }
        }
      } catch (error) {
        console.warn("[Sloka] audio error", "", error);
        console.info("[Sloka] audio error", { id: slokaAudioId, url: "", error });
        if (!isStale()) {
          setIsSlokaPlaying(false);
          setSlokaStatus("unavailable");
        }
      }
    },
    [releaseAudio, stopSloka],
  );

  return {
    activeSlokaScript,
    activeSlokaTranslation,
    isSlokaTranslationEnglishFallback,
    isSlokaPlaying,
    isSlokaOpen,
    slokaStatus,
    slokaCurrentTime,
    slokaDuration,
    slokaSpeed,
    slokaLoopCount,
    hasSlokaAudio,
    handlePostVerse,
    toggleSlokaPlayback,
    restartSloka,
    seekSloka,
    setSlokaSpeed,
    setSlokaLoopCount,
    refreshSlokaTranslation,
    stopSloka,
  };
}