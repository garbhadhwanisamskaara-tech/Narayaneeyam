import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { getStorageUrl } from "@/lib/storageUrl";
import { registerAudioElement, useGlobalMute } from "@/lib/globalMute";

const FADE_SECONDS = 2;

/**
 * Ambient flute loop for the public landing page.
 * - Auto-plays on load (falls back to first user interaction if the browser blocks it)
 * - Fades out over the last 2s then loops back to the start
 * - Fades out over 2s when leaving the landing page instead of cutting abruptly
 * - Respects the app-wide mute state
 */
export default function LandingFlute() {
  const [muted, toggleMuted] = useGlobalMute();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(getStorageUrl("Common/SN_Flute_landing.mp3"));
    audio.preload = "auto";
    audio.setAttribute("playsinline", "true");
    audio.volume = 1;
    audioRef.current = audio;
    const unregister = registerAudioElement(audio);

    const onTimeUpdate = () => {
      const d = audio.duration;
      if (!d || !Number.isFinite(d)) return;
      const remaining = d - audio.currentTime;
      if (remaining <= FADE_SECONDS) {
        audio.volume = Math.max(0, remaining / FADE_SECONDS);
      } else if (audio.volume < 1) {
        audio.volume = 1;
      }
    };

    const restart = () => {
      audio.currentTime = 0;
      audio.volume = 1;
      audio.play().catch(() => {});
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", restart);

    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();

    // Autoplay may be blocked — start on the first user gesture instead.
    const onFirstGesture = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", restart);
      unregister();
      audioRef.current = null;

      // Fade out over 2s as the visitor navigates away, then stop.
      const startVolume = audio.volume;
      const steps = 40;
      let step = 0;
      const interval = setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, startVolume * (1 - step / steps));
        if (step >= steps) {
          clearInterval(interval);
          audio.pause();
          audio.removeAttribute("src");
        }
      }, (FADE_SECONDS * 1000) / steps);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? "Unmute background music" : "Mute background music"}
      title={muted ? "Unmute background music" : "Mute background music"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "#D4521A",
        padding: 4,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#C8922A")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#D4521A")}
    >
      {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
    </button>
  );
}
