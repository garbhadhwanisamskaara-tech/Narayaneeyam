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

  // --- Playback lifecycle bookkeeping (refs, never state) ---
  /** Reason the audio last stopped: distinguishes user intent from system interruption. */
  const pauseReasonRef = useRef<"user" | "system" | "ended" | "source-change" | "teardown" | null>(null);
  /** True while an audio.play() promise is pending — guards duplicate play calls. */
  const playInProgressRef = useRef(false);
  /** Snapshot taken when the document is hidden. */
  const hiddenSnapshotRef = useRef<{ wasPlaying: boolean; src: string } | null>(null);

  const devLog = (...args: unknown[]) => {
    if (import.meta.env.DEV) console.warn("[AudioEngine]", ...args);
  };


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
      pauseReasonRef.current = "ended";
      setState((s) => ({ ...s, isPlaying: false, isPaused: false, progress: 100 }));
      onEndedRef.current?.();
    };
    const onPause = () => {
      stopTracking();
      // Any pause not explicitly attributed is a browser/system interruption
      if (pauseReasonRef.current === null) pauseReasonRef.current = "system";
      // Only mark paused if we didn't explicitly stop (src cleared)
      setState((s) => ({ ...s, isPlaying: false, isPaused: !!s.src }));
    };
    const onPlay = () => {
      startTracking();
      pauseReasonRef.current = null;
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

  // --- Page lifecycle: restore ONLY playback the system interrupted ---
  useEffect(() => {
    const snapshot = () => {
      hiddenSnapshotRef.current = {
        // Genuinely playing: not paused, not ended, and not paused by the user
        wasPlaying: !audio.paused && !audio.ended && pauseReasonRef.current !== "user",
        src: audio.currentSrc || audio.src || "",
      };
    };

    const restore = () => {
      const snap = hiddenSnapshotRef.current;
      hiddenSnapshotRef.current = null;
      if (!snap || !snap.wasPlaying) return;
      // Source changed, another channel took over, or playback finished/was stopped
      const currentSrc = audio.currentSrc || audio.src || "";
      if (!currentSrc || currentSrc !== snap.src) return;
      if (audio.ended) return;
      // The user pressed pause (e.g. via lock-screen controls) — respect it
      if (pauseReasonRef.current === "user") return;
      if (!audio.paused) return; // already playing, nothing to do
      if (playInProgressRef.current) return; // guard duplicate play calls

      playInProgressRef.current = true;
      audio
        .play()
        .catch((e) => {
          // No retry loop: surface a resume-required state and keep the position
          devLog("resume after background blocked:", e);
          setState((s) => ({ ...s, isPlaying: false, isPaused: !!s.src }));
        })
        .finally(() => {
          playInProgressRef.current = false;
        });
    };

    const onVisibility = () => {
      if (document.hidden) snapshot();
      else restore();
    };
    // pagehide/pageshow never stop or reset playback — they only bookkeep
    const onPageHide = () => snapshot();
    const onPageShow = () => restore();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [audio]);

  const play = useCallback(
    async (url: string): Promise<boolean> => {
      if (playInProgressRef.current) {
        devLog("play() ignored — a play request is already in flight");
        return false;
      }
      playInProgressRef.current = true;
      pauseReasonRef.current = "source-change";
      hiddenSnapshotRef.current = null;
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
        pauseReasonRef.current = null;
        return true;
      } catch (e) {
        console.error("AudioEngine play error:", e);
        setState((s) => ({ ...s, isPlaying: false, isPaused: false }));
        return false;
      } finally {
        playInProgressRef.current = false;
      }
    },
    [audio],
  );

  const pause = useCallback(() => {
    pauseReasonRef.current = "user";
    audio.pause();
  }, [audio]);

  const resume = useCallback(async (): Promise<boolean> => {
    if (playInProgressRef.current) {
      devLog("resume() ignored — a play request is already in flight");
      return false;
    }
    playInProgressRef.current = true;
    try {
      await audio.play();
      pauseReasonRef.current = null;
      return true;
    } catch (e) {
      console.error("AudioEngine resume error:", e);
      setState((s) => ({ ...s, isPlaying: false, isPaused: !!s.src }));
      return false;
    } finally {
      playInProgressRef.current = false;
    }
  }, [audio]);


  const stop = useCallback(() => {
    pauseReasonRef.current = "teardown";
    hiddenSnapshotRef.current = null;
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
