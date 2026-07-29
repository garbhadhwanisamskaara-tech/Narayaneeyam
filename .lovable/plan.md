## What's happening today

- The bell (`Common/BellFinal.mp3`) is triggered in exactly one place: `useSlokaPlayback` — after a verse's linked **sloka** audio finishes.
- I checked `verses_audio` for Dashakam 1: all 10 verses have `sloka_audio_id = null`, so the app never rings the bell there. The bell you heard before verse 9 is **baked into the recording** `Chant/SN001/SN001_08.mp3` on the CDN — that one needs an audio-file re-cut, not a code change.
- Dashakam 1's `prasadam` table has exactly one row: verse 10 ("Any fruit or water").

## Changes to make

### 1. Bell rings only after a Prasadam verse

The verse data already carries `prasadam` (from `useDashakam` → `prasadam_text`). In `ChantPage.tsx`'s `handleVerseEnded`, drive the bell off that flag instead of off sloka:

```text
verse audio ends
  ├─ has sloka?      → play sloka script + audio
  ├─ has prasadam?   → ring bell
  └─ then            → next verse
```

- `src/hooks/useSlokaPlayback.ts` — remove the unconditional `await playBellAudio()` after sloka audio; add an optional `playBell` argument so the caller decides.
- `src/pages/ChantPage.tsx` — pass `!!currentVerse.prasadam` through to `handlePostVerse`, and for verses with **no** sloka but **with** prasadam, ring the bell before advancing.

Net effect: in Dashakam 1 the bell rings once, after verse 10, and nowhere else.

### 2. Never stall when audio is missing

- `src/pages/ChantPage.tsx` — the "no valid audio URL" branch currently waits `setTimeout(..., 2000)` before moving on. Advance immediately instead (keep a minimal tick so React state settles), and also advance on the audio `error` event rather than sitting on a dead verse.
- `src/hooks/useSlokaPlayback.ts` — the no-sloka-audio branch waits 2000 ms; drop it so the flow continues right away. Same for the existing `onerror` / failed-`play()` paths (already advance, just confirm no delay).

### Not in scope

The `has_bell` field that `AdminUploadPage.tsx` reads and writes does not exist as a column on `verses_audio` — that admin toggle is dead. Leaving it alone unless you want it cleaned up separately; the new rule reads Prasadam, so the toggle isn't needed.
