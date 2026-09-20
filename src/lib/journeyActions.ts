import type { NavigateFunction } from "react-router-dom";
import type { JourneyDay } from "@/hooks/useJourney";

/**
 * The single place a new action_type gets a new `case` (§15/§13).
 *
 * Route notes (checked against the real pages):
 *  - ChantPage supports ?dashakam=, ?verse= and ?play=1, so OPEN_VERSE and
 *    OPEN_AUDIO use those query params.
 *  - ScriptPage and PodcastPage take no query params today, so OPEN_MEANING
 *    and the audio fallback navigate to the bare route.
 */
export function resolveJourneyDayAction(day: JourneyDay, navigate: NavigateFunction): void {
  const payload = (day.action_payload ?? {}) as Record<string, unknown>;

  switch (day.action_type) {
    case "OPEN_DASHAKAM":
      navigate(`/chant/${payload.dashakam_no}`);
      return;
    case "OPEN_VERSE": {
      const params = new URLSearchParams();
      if (payload.dashakam_no != null) params.set("dashakam", String(payload.dashakam_no));
      if (payload.verse_no != null) params.set("verse", String(payload.verse_no));
      navigate(`/chant${params.toString() ? `?${params}` : ""}`);
      return;
    }
    case "OPEN_MEANING":
      // ScriptPage has no jump-to param; it opens on its own dashakam picker.
      navigate(`/script`);
      return;
    case "OPEN_AUDIO": {
      if (payload.dashakam_no != null) {
        navigate(`/chant?dashakam=${payload.dashakam_no}&play=1`);
        return;
      }
      navigate(`/listen`);
      return;
    }
    case "OPEN_PRASADAM":
      navigate(`/prasadam`);
      return;
    case "OPEN_PAGE":
      if (typeof payload.route === "string") navigate(payload.route);
      return;
    case "EXTERNAL_LINK":
      if (typeof payload.url === "string") window.open(payload.url, "_blank", "noopener,noreferrer");
      return;
    case "NONE":
    default:
      return;
  }
}
