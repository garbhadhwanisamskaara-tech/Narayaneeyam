/**
 * Fire-and-forget linear volume fade for a plain HTMLAudioElement.
 *
 * Used by every standalone (non-engine) audio surface — sloka playback,
 * the ritual chant overlay, the landing-page flute — so "navigate away
 * while playing" fades out identically everywhere in the app (2s ramp
 * to silence, same as the shared chant/podcast engine's fadeOutAndStop).
 *
 * Runs independently of React: it only needs a plain reference to the
 * audio element, so the fade keeps running even after the owning
 * component has already unmounted.
 */
export function fadeOutElement(
  audio: HTMLAudioElement,
  durationMs: number,
  onDone?: () => void,
) {
  if (audio.paused || !audio.src) {
    onDone?.();
    return;
  }
  const steps = 20;
  const stepMs = Math.max(16, durationMs / steps);
  const startVolume = audio.volume;
  let step = 0;

  const timer = setInterval(() => {
    step += 1;
    audio.volume = Math.max(0, startVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(timer);
      audio.volume = 1; // restore for whatever plays next
      onDone?.();
    }
  }, stepMs);
}
