import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

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
  play: (url: string) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
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
      setState((s) => ({ ...s, isPlaying: false, isPaused: false, progress: 100 }));
      onEndedRef.current?.();
    };
    const onPause = () => {
      // Only mark paused if we didn't explicitly stop (src cleared)
      setState((s) => ({ ...s, isPlaying: false, isPaused: !!s.src }));
    };
    const onPlay = () => {
      setState((s) => ({ ...s, isPlaying: true, isPaused: false }));
    };

    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("ended", onEnded);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
    };
  }, [audio]);

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
    async (url: string) => {
      audio.src = url;
      audio.load();
      setState((s) => ({ ...s, src: url, progress: 0, isPlaying: true, isPaused: false }));
      try {
        await audio.play();
      } catch (e) {
        console.error("AudioEngine play error:", e);
      }
    },
    [audio],
  );

  const pause = useCallback(() => {
    audio.pause();
  }, [audio]);

  const resume = useCallback(async () => {
    try {
      await audio.play();
    } catch (e) {
      console.error("AudioEngine resume error:", e);
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

  const engine: AudioEngine = {
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
  };

  return <AudioCtx.Provider value={engine}>{children}</AudioCtx.Provider>;
}
