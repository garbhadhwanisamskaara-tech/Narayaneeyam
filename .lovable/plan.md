# Remove the bell entirely

Bell sounds are already mixed into the verse audio files, so all separate bell playback and the tappable bell icon go away.

## Scope (files affected)

- `src/components/VerseIcons.tsx` — remove the bell button, its pointer/hover/click handlers, the `bell` prop, the `handledByPointerRef`, and the `canHover` check. Keep the Prasadam flame tooltip and the sloka 📿 indicator.
- `src/lib/bellAudio.ts` — delete the file (no remaining callers after the changes below).
- `src/hooks/useSlokaPlayback.ts` — remove the `playBell` parameter and both `playBellAudio()` calls (pre-sloka and post-verse `finishOnce` paths). Sloka playback and the single-run completion guards stay exactly as they are.
- `src/pages/ChantPage.tsx` — remove `shouldRingBell`, stop passing `shouldRingBell` into `useSlokaPlayback`, drop the `bell` prop passed to `VerseIcons`, and remove the `bell: false` field in the verse mapping. The sloka path is still taken when a verse has `sloka_audio_id`; verses that only had a bell now just advance normally.
- `src/pages/ScriptPage.tsx` — drop the `bell={false}` prop on `VerseIcons`.

Podcast: no bell code exists in `PodcastPage.tsx`, so no change is needed there — its end-of-dashakam bell comes from the mixed audio.

Not touched: main verse audio playback, `AudioContext`, prasadam/favourite/bookmark behaviour, and the admin "Bell" toggle in the content upload panel (that is a data field, separate from playback).

## Verification

Typecheck plus a quick preview pass on a Chant dashakam that has a prasadam verse, to confirm no bell icon renders, playback advances verse-to-verse cleanly, and slokas still play.
