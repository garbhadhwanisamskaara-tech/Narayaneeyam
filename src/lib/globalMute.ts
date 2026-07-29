/**
 * Global mute state shared by every audio surface in the app
 * (chant engine, sloka playback, bell, podcast, landing flute).
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

/** Keep an audio element in sync with the global mute state. Returns an unregister fn. */
export function registerAudioElement(el: HTMLAudioElement | null | undefined) {
  if (!el) return () => {};
  el.muted = muted;
  elements.add(el);
  return () => {
    elements.delete(el);
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
