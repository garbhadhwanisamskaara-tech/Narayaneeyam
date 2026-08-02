# Reliable bell sound on mobile

Make the bell ring predictably on touch devices and stop overlapping bell instances from cutting each other off.

## 1. Touch-first trigger (`src/components/VerseIcons.tsx`)

- Make tap the primary trigger: fire the bell on `onPointerUp` when the pointer type is touch/pen, and on `onClick` otherwise. This guarantees a ring on the first tap even in browsers that delay or synthesise clicks.
- Keep hover as a desktop-only extra: only fire `onMouseEnter` when the device actually supports hover (`window.matchMedia("(hover: hover)")`), so mobile browsers that emit a phantom `mouseenter` on tap no longer double-trigger.
- Add `touch-action: manipulation` and a slightly larger tap target on the bell button so taps register cleanly on small screens.

## 2. Single-instance guard (`src/lib/bellAudio.ts`)

Chosen behavior: **ignore new triggers while a bell is already ringing** (let the current bell finish). This is the more natural feel for a temple bell — a tap during an automatic post-verse bell will not chop the sound in half.

- Track a module-level "bell is active" flag alongside the existing `bellAudioInstance`.
- `playBellAudio()` returns a promise that resolves when the *currently playing* bell finishes if one is already active, instead of creating a second `HTMLAudioElement`. Callers awaiting it (the post-verse flow in `useSlokaPlayback.ts`) therefore stay correctly sequenced.
- Clear the flag in every completion path: natural end, fade-out completion, the 3.5s safety timeout, and `stopBellAudio()`.
- `stopBellAudio()` keeps its current force-stop semantics (used when playback is cancelled).

No changes to `useSlokaPlayback.ts` are needed — it already awaits `playBellAudio()`.

## 3. Verification

- Automated check in a mobile-emulated Chromium viewport with touch enabled: tap the bell on a prasadam verse repeatedly and assert exactly one audio element plays per ring and that the element reaches a playing state each time.
- A real physical-device test cannot be run from here. After the change ships to preview, please tap the bell next to a prasadam verse on your phone a few times, and once during an automatic post-verse bell, to confirm it rings every time.
