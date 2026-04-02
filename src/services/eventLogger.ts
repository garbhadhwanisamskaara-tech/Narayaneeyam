import { supabase } from "@/integrations/supabase/client";

type EventType =
  | "user_login" | "user_logout" | "user_signup"
  | "chant_started" | "learn_started" | "verse_started" | "verse_completed" | "chant_completed"
  | "audio_play" | "audio_pause" | "audio_complete" | "audio_error" | "audio_load" | "audio_load_slow"
  | "app_error" | "page_view";

interface EventMetadata {
  dashakam?: number;
  verse?: number;
  audio_file?: string;
  audio_url?: string;
  load_time_ms?: number;
  error_message?: string;
  browser?: string;
  device?: string;
  network?: string;
  [key: string]: unknown;
}

function getBrowserInfo(): { browser: string; device: string; network: string } {
  const ua = navigator.userAgent;
  let browser = "unknown";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";

  const device = /Mobi|Android/i.test(ua) ? "mobile" : "desktop";
  const conn = (navigator as any).connection;
  const network = conn?.effectiveType || "unknown";

  return { browser, device, network };
}

/**
 * Log an event to the app_events table.
 * Non-blocking — never throws or delays UI.
 */
export function logEvent(eventType: EventType, metadata?: EventMetadata): void {
  // Fire and forget
  (async () => {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      const { browser, device, network } = getBrowserInfo();

      await supabase.from("app_events").insert({
        event_type: eventType,
        user_id: userId,
        metadata: {
          ...metadata,
          browser: metadata?.browser || browser,
          device: metadata?.device || device,
          network: metadata?.network || network,
        },
      } as any);
    } catch {
      // Silently fail — never block UI
    }
  })();
}

/** Convenience: log audio event with standard fields */
export function logAudioEvent(
  eventType: "audio_play" | "audio_pause" | "audio_complete" | "audio_error" | "audio_load" | "audio_load_slow",
  dashakam: number,
  verse: number,
  audioFile: string,
  extra?: Partial<EventMetadata>
): void {
  logEvent(eventType, {
    dashakam,
    verse,
    audio_file: audioFile,
    ...extra,
  });
}
