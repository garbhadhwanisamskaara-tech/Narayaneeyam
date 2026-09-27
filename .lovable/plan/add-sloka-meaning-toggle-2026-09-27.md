# Add sloka meaning toggle

## Chant overlay
- Pass both the reader’s script language and translation language into sloka loading.
- Fetch script and meaning candidates together for those languages plus English.
- Keep the current script-language fallback, while selecting meaning independently from the translation language and then English.
- Track whether English was used as the meaning fallback.
- Refresh the open sloka’s meaning when the reader changes translation language without restarting its audio.

## Meaning control and display
- Add an overlay-only Meaning toggle beside the Loop selector, matching the main Chant Meaning chip styling.
- Initialize it from the main Chant Meaning setting each time a sloka opens; later overlay toggles will not alter the main setting.
- Hide the toggle when neither the preferred translation nor English has meaning text.
- When enabled, show a separated Meaning section within the scrolling text area, using the same typography as verse meanings.
- Add a small “(English)” label beside the heading only when English fallback meaning is shown.

## Scope and verification
- Modify only the Chant screen and existing sloka playback hook.
- Make no database changes and preserve current sloka playback behavior.
- Verify compilation and the focused language/fallback paths.
