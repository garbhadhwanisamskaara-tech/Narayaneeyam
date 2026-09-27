# Prevent sloka cancellation on Chant

## Chant scroll handling
- Keep a live ref synchronized with sloka playback state.
- Ignore scroll handling both immediately and after the debounce while a sloka is displayed.
- Track genuine wheel, touch, and supported keyboard scrolling intent for one second; ignore programmatic scroll events.
- Preserve all existing manual verse-change behavior once genuine intent is present.

## Sloka playback
- Fetch active status with the sloka audio and skip inactive slokas immediately.
- Fetch requested-language and English scripts together, preferring the requested language and falling back to English.
- Keep the sloka card visible for six seconds after an audio error or rejected play before continuing.
- Add the requested production `[Sloka]` lifecycle logs, including cancellation reasons.

## Scope and verification
- Modify only `src/pages/ChantPage.tsx` and `src/hooks/useSlokaPlayback.ts`.
- Make no database changes.
- Verify TypeScript/build output and focused playback control paths.
