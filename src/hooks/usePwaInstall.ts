import { useCallback, useEffect, useState } from "react";
import { detectPlatform } from "@/lib/platform";

export type PwaPlatform = "ios-safari" | "macos-safari" | "chromium" | "other";
export type PromptOutcome = "accepted" | "dismissed" | "error" | "unsupported";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPwaPlatform(): PwaPlatform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;

  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
  if (isIos) {
    // Chrome / Edge / Firefox on iOS report a Safari-like UA.
    if (/CriOS|EdgiOS|FxiOS/.test(ua)) return "chromium";
    return "ios-safari";
  }

  if (/Macintosh/.test(ua)) {
    if (/Chrome|Chromium|Edg/.test(ua)) return "chromium";
    if (/Safari/.test(ua) && !/Firefox|FxiOS/.test(ua)) return "macos-safari";
    return "other";
  }

  if (/Chrome|Chromium|Edg|SamsungBrowser/.test(ua) && !/Firefox/.test(ua)) return "chromium";
  return "other";
}

function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform] = useState<PwaPlatform>(() => detectPwaPlatform());
  const [isInstalled, setIsInstalled] = useState<boolean>(() => detectInstalled());

  // Reuses the app's single Web vs Play TWA detection.
  const isTwa = detectPlatform() === "PLAY_TWA";

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<PromptOutcome> => {
    if (!deferredPrompt) return "unsupported";
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return choice.outcome === "accepted" ? "accepted" : "dismissed";
    } catch {
      return "error";
    }
  }, [deferredPrompt]);

  return {
    platform,
    isInstalled,
    isTwa,
    canPrompt: !!deferredPrompt,
    promptInstall,
  };
}
