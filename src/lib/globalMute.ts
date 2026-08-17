/**
 * Global mute state AND playback exclusivity, shared by every audio surface
 * in the app (chant engine, sloka playback, ritual chant overlay, podcast,
 * landing flute).
 *
 * Every surface that plays audio must call registerAudioElement() on its
 * <audio> element. That gives it two things for free:
 *  - it stays in sync with the app-wide mute toggle
 *  - starting playback on it automatically pauses every OTHER registered
 *    element, so at most one audio source is ever audible at a time
 */
import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "sn_global_muted";

let muted = (() => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
})();

const listeners = new Set<() => void>();
const elements = new Set<HTMLAudioElement>();
/** Per-element "play" listeners, tracked so we can remove them on unregister. */
const playHandlers = new WeakMap<HTMLAudioElement, () => void>();

export function isMuted() {
  return muted;
}

export function setGlobalMuted(value: boolean) {
  if (muted === value) return;
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    /* ignore */
  }
  elements.forEach((el) => {
    el.muted = value;
  });
  listeners.forEach((l) => l());
}

export function toggleGlobalMuted() {
  setGlobalMuted(!muted);
}

/** Pause every other registered element besides the one that just started. */
function pauseOthers(active: HTMLAudioElement) {
  elements.forEach((other) => {
    if (other === active) return;
    if (other.paused) return;
    try {
      other.pause();
    } catch {
      /* ignore */
    }
  });
}

/**
 * Keep an audio element in sync with the global mute state, and make it a
 * participant in app-wide playback exclusivity (starting it stops all other
 * registered elements; another element starting later stops this one).
 * Returns an unregister fn — always call it when the element is done/unmounted.
 */
export function registerAudioElement(el: HTMLAudioElement | null | undefined) {
  if (!el) return () => {};
  el.muted = muted;
  elements.add(el);

  // Avoid double-registering a listener if the same element is registered twice
  if (!playHandlers.has(el)) {
    const onPlay = () => pauseOthers(el);
    el.addEventListener("play", onPlay);
    playHandlers.set(el, onPlay);
  }

  return () => {
    elements.delete(el);
    const onPlay = playHandlers.get(el);
    if (onPlay) {
      el.removeEventListener("play", onPlay);
      playHandlers.delete(el);
    }
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useGlobalMute(): [boolean, () => void] {
  const value = useSyncExternalStore(subscribe, isMuted, isMuted);
  const toggle = useCallback(() => toggleGlobalMuted(), []);
  return [value, toggle];
}
