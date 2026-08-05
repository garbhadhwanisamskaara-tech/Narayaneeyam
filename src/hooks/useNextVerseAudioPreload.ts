import { useCallback, useEffect, useRef } from "react";

/**
 * Conservative next-verse audio preloading.
 *
 * Uses ONE reusable hidden <audio> element (never played, muted, preload="auto")
 * to warm the browser HTTP cache for the single next likely verse audio file.
 * When the engine later plays that URL, the bytes are already cached, which
 * removes most of the silence between verses.
 *
 * It deliberately does NOT:
 *  - preload more than one item ahead
 *  - touch the global AudioContext engine or any other playback flow
 *  - persist anything offline
 */

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn("[Preload]", ...args);
};

/** Cheap heuristic: skip preloading on Save-Data or very constrained links. */
function shouldSkipForNetwork(): string | null {
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!conn) return null;
  if (conn.saveData) return "save-data";
  if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
    return `slow-connection (${conn.effectiveType})`;
  }
  return null;
}

export interface NextAudioPreloader {
  /**
   * Warm the cache for `url`. Passing null/undefined cancels any pending preload.
   * When `activeSrc` equals `url` the request is skipped: that source is already
   * loaded by the playing engine (e.g. a single verse repeating), so re-fetching
   * it would only duplicate network traffic.
   */
  preload: (url: string | null | undefined, activeSrc?: string | null) => void;
  /** Cancel and release the current preload (does not destroy the element). */
  cancel: () => void;
  /** True when `url` is the source that was successfully preloaded. */
  wasPreloaded: (url: string | null | undefined) => boolean;
}


export function useNextVerseAudioPreload(): NextAudioPreloader {
  const elRef = useRef<HTMLAudioElement | null>(null);
  /** URL currently being (or already) preloaded. */
  const requestedRef = useRef<string | null>(null);
  /** URL that reached a usable readyState. */
  const readyRef = useRef<string | null>(null);

  const getElement = useCallback(() => {
    if (!elRef.current) {
      const el = new Audio();
      el.preload = "auto";
      el.muted = true;
      el.volume = 0;
      el.autoplay = false;
      el.setAttribute("playsinline", "true");
      // Never registered with globalMute and never played — this element is
      // a cache-warmer only.
      elRef.current = el;
    }
    return elRef.current;
  }, []);

  const cancel = useCallback(() => {
    const el = elRef.current;
    requestedRef.current = null;
    readyRef.current = null;
    if (!el) return;
    el.oncanplaythrough = null;
    el.onloadeddata = null;
    el.onerror = null;
    if (el.getAttribute("src")) {
      el.removeAttribute("src");
      try {
        el.load(); // aborts any in-flight fetch
      } catch {
        /* ignore */
      }
    }
  }, []);

  const preload = useCallback(
    (url: string | null | undefined, activeSrc?: string | null) => {
      if (!url) {
        if (requestedRef.current) devLog("preload skipped — no next source");
        cancel();
        return;
      }
      if (activeSrc && activeSrc === url) {
        // The repeating source is already loaded by the engine — keep it warm
        // there instead of issuing a duplicate request.
        if (requestedRef.current !== url) {
          devLog("preload skipped — next source is the currently playing one", url);
        }
        return;
      }
      if (requestedRef.current === url) return; // already warming/warmed — no duplicate traffic


      const skipReason = shouldSkipForNetwork();
      if (skipReason) {
        devLog("preload skipped —", skipReason);
        cancel();
        return;
      }

      cancel();
      const el = getElement();
      requestedRef.current = url;
      devLog("preload started", url);

      const markReady = () => {
        if (requestedRef.current !== url) return;
        if (readyRef.current === url) return;
        readyRef.current = url;
        devLog("preload ready", url);
      };

      el.onloadeddata = markReady;
      el.oncanplaythrough = markReady;
      el.onerror = () => {
        if (requestedRef.current !== url) return;
        devLog("preload failed", url, el.error?.message ?? "");
        // Failure is never fatal — normal playback fetches the file itself.
        requestedRef.current = null;
        readyRef.current = null;
      };

      try {
        el.src = url;
        el.load();
      } catch (e) {
        devLog("preload failed to start", url, e);
        requestedRef.current = null;
      }
    },
    [cancel, getElement],
  );

  const wasPreloaded = useCallback(
    (url: string | null | undefined) => !!url && readyRef.current === url,
    [],
  );

  // Release the element on unmount so no fetch outlives the page
  useEffect(() => {
    return () => {
      cancel();
      elRef.current = null;
    };
  }, [cancel]);

  return { preload, cancel, wasPreloaded };
}
