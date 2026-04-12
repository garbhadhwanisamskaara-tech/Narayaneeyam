/**
 * Bell audio utility
 * Plays the real bell audio for 3 seconds with a 1-second fade-out (every 10ms).
 */
import { getStorageUrl } from "@/lib/storageUrl";

let bellAudioInstance: HTMLAudioElement | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function cleanup() {
  if (fadeInterval) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
  if (bellAudioInstance) {
    bellAudioInstance.pause();
    bellAudioInstance.currentTime = 0;
    bellAudioInstance = null;
  }
}

/**
 * Play the bell sound for 3 seconds.
 * Last 1 second fades out with volume decrements every 10ms.
 * Returns a promise that resolves when done.
 */
export function playBellAudio(): Promise<void> {
  return new Promise((resolve) => {
    cleanup();

    const bellUrl = "https://znglsaxfyhkuzyrfbuhn.supabase.co/storage/v1/object/public/Narayaneeyam/Common/BellFinal.mp3";
    const audio = new Audio(bellUrl);
    bellAudioInstance = audio;
    audio.volume = 1.0;

    audio.play().catch(() => {
      // Silently handle play interruptions
      resolve();
    });

    // After 2 seconds, start 1-second fade (100 steps over 1000ms)
    const fadeStartTimer = setTimeout(() => {
      const startVolume = audio.volume;
      const steps = 100; // every 10ms
      let step = 0;

      fadeInterval = setInterval(() => {
        step++;
        const newVolume = startVolume * (1 - step / steps);
        audio.volume = Math.max(0, newVolume);

        if (step >= steps) {
          cleanup();
          resolve();
        }
      }, 10);
    }, 2000);

    // Safety: stop after 3.5 seconds no matter what
    setTimeout(() => {
      cleanup();
      resolve();
    }, 3500);

    audio.onended = () => {
      clearTimeout(fadeStartTimer);
      cleanup();
      resolve();
    };
  });
}

/**
 * Stop any currently playing bell audio immediately.
 */
export function stopBellAudio() {
  cleanup();
}
