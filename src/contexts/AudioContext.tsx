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
  /**
   * Reason the audio last stopped. Only "system" (or an unattributed pause that
   * gets classified as "system") is ever eligible for auto-resume after the app
   * returns to the foreground. Every deliberate/cleanup pause must be one of
   * "user" | "ended" | "source-change" | "teardown" | "cancelled" |
   * "controlled-transition".
   */
  type PauseReason =
    | "user"
    | "system"
    | "ended"
    | "source-change"
    | "teardown"
    | "cancelled"
    | "controlled-transition";
  const pauseReasonRef = useRef<PauseReason | null>(null);
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

  // --- Native media event wiring (single source of truth, no polling) ---
  useEffect(() => {
    const a = audio;
    // Throttle progress commits to ~5/sec so React renders stay cheap
    let lastCommit = 0;

    const commitTime = (force = false) => {
      const now = performance.now();
      if (!force && now - lastCommit < 200) return;
      lastCommit = now;
      const dur = Number.isFinite(a.duration) ? a.duration : 0;
      setState((s) => {
        const progress = dur > 0 ? (a.currentTime / dur) * 100 : s.progress;
        if (
          Math.abs(s.currentTime - a.currentTime) < 0.01 &&
          s.duration === dur &&
          Math.abs(s.progress - progress) < 0.01
        ) {
          return s;
        }
        return { ...s, progress, currentTime: a.currentTime, duration: dur };
      });
    };

    const onTimeUpdate = () => commitTime();
    const onSeeked = () => commitTime(true);
    const onDurationChange = () => commitTime(true);

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
    const onPlaying = () => {
      startTracking();
      pauseReasonRef.current = null;
      setState((s) => (s.isPlaying && !s.isPaused ? s : { ...s, isPlaying: true, isPaused: false }));
    };
    const onPlay = () => {
      pauseReasonRef.current = null;
      setState((s) => (s.isPlaying && !s.isPaused ? s : { ...s, isPlaying: true, isPaused: false }));
    };

    const onLoadedMetadata = () => {
      // Some browsers reset the rate when new media loads
      if (a.playbackRate !== rateRef.current) a.playbackRate = rateRef.current;
      commitTime(true);
    };

    const onStalled = () => devLog("audio stalled");
    const onWaiting = () => devLog("audio waiting (buffering)");
    const onError = () => devLog("audio element error", a.error?.message);

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("seeked", onSeeked);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("loadedmetadata", onLoadedMetadata);
    a.addEventListener("stalled", onStalled);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("seeked", onSeeked);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("loadedmetadata", onLoadedMetadata);
      a.removeEventListener("stalled", onStalled);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("error", onError);
    };
  }, [audio, startTracking, stopTracking]);


  // --- Page lifecycle: restore ONLY playback the system interrupted ---
  useEffect(() => {
    /** Only an unattributed/system stop may ever be auto-resumed. */
    const isResumable = () =>
      pauseReasonRef.current === null || pauseReasonRef.current === "system";

    const snapshot = () => {
      hiddenSnapshotRef.current = {
        // Genuinely playing: not paused, not ended, and not stopped deliberately
        // (user pause, teardown, cancellation, source change, controlled transition)
        wasPlaying: !audio.paused && !audio.ended && isResumable(),
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
      // Any deliberate stop (user pause via lock screen, teardown, cleanup,
      // cancellation, source change) must never be auto-resumed
      if (!isResumable()) return;
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
      navigator.mediaSession.setActionHandler("play", () => {
        if (playInProgressRef.current) return;
        playInProgressRef.current = true;
        audio.play().catch((e) => devLog("mediaSession play blocked:", e)).finally(() => {
          playInProgressRef.current = false;
        });
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        pauseReasonRef.current = "user";
        audio.pause();
      });
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
