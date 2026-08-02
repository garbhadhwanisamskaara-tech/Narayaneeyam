/**
 * Bell audio utility
 * Plays the real bell audio for 3 seconds with a 1-second fade-out (every 10ms).
 * Only one bell can ring at a time — while a bell is active, new triggers
 * simply await the current one instead of creating a competing audio element.
 */
import { getStorageUrl } from "@/lib/storageUrl";
import { isMuted } from "@/lib/globalMute";

let bellAudioInstance: HTMLAudioElement | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;
/** Promise for the bell that is currently ringing (null when idle). */
let activeBell: Promise<void> | null = null;

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
 * If a bell is already ringing, this resolves when that bell finishes
 * (no second instance is created).
 */
export function playBellAudio(): Promise<void> {
  if (activeBell) return activeBell;

  const bell = new Promise<void>((resolve) => {
    cleanup();

    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      clearTimeout(fadeStartTimer);
      clearTimeout(safetyTimer);
      cleanup();
      resolve();
    };

    const bellUrl = getStorageUrl("Common/BellFinal.mp3");
    const audio = new Audio(bellUrl);
    bellAudioInstance = audio;
    audio.volume = 1.0;
    audio.muted = isMuted();

    audio.play().catch(() => {
      // Silently handle play interruptions
      done();
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

        if (step >= steps) done();
      }, 10);
    }, 2000);

    // Safety: stop after 3.5 seconds no matter what
    const safetyTimer = setTimeout(done, 3500);

    audio.onended = done;
    audio.onerror = done;
  });

  activeBell = bell;
  void bell.finally(() => {
    if (activeBell === bell) activeBell = null;
  });

  return bell;
}

/**
 * Stop any currently playing bell audio immediately.
 */
export function stopBellAudio() {
  cleanup();
  activeBell = null;
}
