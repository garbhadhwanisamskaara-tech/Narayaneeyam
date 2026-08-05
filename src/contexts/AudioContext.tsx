import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { addChantingSeconds } from "@/lib/progress";
import { recordListeningTimeSupabase } from "@/lib/supabaseProgress";
import { registerAudioElement } from "@/lib/globalMute";

interface AudioState {
  src: string | null;
  isPlaying: boolean;
  isPaused: boolean;
  progress: number; // 0-100
  duration: number;
  currentTime: number;
}

interface AudioEngine {
  state: AudioState;
  play: (url: string) => Promise<boolean>;
  pause: () => void;
  resume: () => Promise<boolean>;
  stop: () => void;
  seek: (pct: number) => void;
  setSpeed: (rate: number) => void;
  setMediaMetadata: (title: string, artist?: string) => void;
  onEnded: React.MutableRefObject<(() => void) | null>;
  audioElement: React.MutableRefObject<HTMLAudioElement>;
}

const AudioCtx = createContext<AudioEngine | null>(null);

export function useAudioEngine(): AudioEngine {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudioEngine must be inside AudioProvider");
  return ctx;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  // Singleton audio element — never recreated
  const audioRef = useRef<HTMLAudioElement>(null!);
  if (!audioRef.current) {
    const a = new Audio();
    a.preload = "auto";
    a.setAttribute("playsinline", "true");
    a.setAttribute("webkit-playsinline", "true");
    registerAudioElement(a);
    audioRef.current = a;
  }

  const audio = audioRef.current;

  const [state, setState] = useState<AudioState>({
    src: null,
    isPlaying: false,
    isPaused: false,
    progress: 0,
    duration: 0,
    currentTime: 0,
  });

  const onEndedRef = useRef<(() => void) | null>(null);
  const rateRef = useRef(1);

  // --- Real listening-time tracking (wall clock, seek-proof) ---
  const listenStartRef = useRef<number | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Commit elapsed wall-clock time since listening started. */
  const flushListeningTime = useCallback((keepTracking: boolean) => {
    const startedAt = listenStartRef.current;
    if (startedAt == null) return;
    const elapsed = (Date.now() - startedAt) / 1000;
    listenStartRef.current = keepTracking ? Date.now() : null;
    if (elapsed <= 0.5) return;
    addChantingSeconds(elapsed);
    void recordListeningTimeSupabase(elapsed);
  }, []);

  const startTracking = useCallback(() => {
    if (listenStartRef.current == null) listenStartRef.current = Date.now();
    if (flushTimerRef.current == null) {
      flushTimerRef.current = setInterval(() => flushListeningTime(true), 60000);
    }
  }, [flushListeningTime]);

  const stopTracking = useCallback(() => {
    flushListeningTime(false);
    if (flushTimerRef.current != null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, [flushListeningTime]);

  // Flush on tab close / background so nothing is lost
  useEffect(() => {
    const onHide = () => {
      if (listenStartRef.current != null) flushListeningTime(true);
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flushListeningTime]);

  // Cleanup on unmount
  useEffect(() => stopTracking, [stopTracking]);

  // --- timeupdate handler ---
  useEffect(() => {
    const a = audio;
    const onTimeUpdate = () => {
      if (!a.duration) return;
      setState((s) => ({
        ...s,
        progress: (a.currentTime / a.duration) * 100,
        currentTime: a.currentTime,
        duration: a.duration,
      }));
    };
    const onEnded = () => {
      stopTracking();
      setState((s) => ({ ...s, isPlaying: false, isPaused: false, progress: 100 }));
      onEndedRef.current?.();
    };
    const onPause = () => {
      stopTracking();
      // Only mark paused if we didn't explicitly stop (src cleared)
      setState((s) => ({ ...s, isPlaying: false, isPaused: !!s.src }));
    };
    const onPlay = () => {
      startTracking();
      setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
    };

    const onLoadedMetadata = () => {
      // Some browsers reset the rate when new media loads
      if (a.playbackRate !== rateRef.current) a.playbackRate = rateRef.current;
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    a.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [audio, startTracking, stopTracking]);

  // --- Visibility change: resume if was playing ---
  useEffect(() => {
    const handler = () => {
      if (!document.hidden && !audio.paused) {
        audio.play().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [audio]);

  const play = useCallback(
    async (url: string): Promise<boolean> => {
      audio.src = url;
      audio.load();
      // load() resets playbackRate to defaultPlaybackRate — re-apply the chosen speed
      audio.defaultPlaybackRate = rateRef.current;
      audio.playbackRate = rateRef.current;
      // Do NOT optimistically mark as playing — the native "play" event does that
      setState((s) => ({ ...s, src: url, progress: 0, currentTime: 0 }));
      try {
        await audio.play();
        audio.playbackRate = rateRef.current;
        return true;
      } catch (e) {
        console.error("AudioEngine play error:", e);
        setState((s) => ({ ...s, isPlaying: false, isPaused: false }));
        return false;
      }
    },
    [audio],
  );

  const pause = useCallback(() => {
    audio.pause();
  }, [audio]);

  const resume = useCallback(async (): Promise<boolean> => {
    try {
      await audio.play();
      return true;
    } catch (e) {
      console.error("AudioEngine resume error:", e);
      setState((s) => ({ ...s, isPlaying: false, isPaused: false }));
      return false;
    }
  }, [audio]);

  const stop = useCallback(() => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load(); // reset
    setState({ src: null, isPlaying: false, isPaused: false, progress: 0, duration: 0, currentTime: 0 });
  }, [audio]);

  const seek = useCallback(
    (pct: number) => {
      if (audio.duration) {
        audio.currentTime = (pct / 100) * audio.duration;
        setState((s) => ({ ...s, progress: pct }));
      }
    },
    [audio],
  );

  const setSpeed = useCallback(
    (rate: number) => {
      rateRef.current = rate;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
    },
    [audio],
  );

  const setMediaMetadata = useCallback((title: string, artist = "Garbha Dhwani") => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title, artist });
      navigator.mediaSession.setActionHandler("play", () => audio.play());
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      });
    }
  }, [audio]);

  const engine: AudioEngine = useMemo(() => ({
    state,
    play,
    pause,
    resume,
    stop,
    seek,
    setSpeed,
    setMediaMetadata,
    onEnded: onEndedRef,
    audioElement: audioRef as React.MutableRefObject<HTMLAudioElement>,
  }), [state, play, pause, resume, stop, seek, setSpeed, setMediaMetadata]);

  return <AudioCtx.Provider value={engine}>{children}</AudioCtx.Provider>;
}
