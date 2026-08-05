# Harden verse audio playback (AudioContext + ChantPage)

Minimal, production-safe changes to the existing playback path. No UI redesign, no DB changes, no changes to URL/CDN resolution, repeat counts, sloka flow, rituals, translations, or navigation.

## 1. AudioContext: play() reports success/failure

- Change `play(url)` from `Promise<void>` to `Promise<boolean>` (both in the `AudioEngine` interface and the implementation).
- Before awaiting `audio.play()`, set only `src`/`progress` in state — do **not** optimistically set `isPlaying: true`. Currently line 181 sets `isPlaying: true` before the promise resolves, which is what leaves the UI stuck in a playing state when playback is rejected.
- On success: return `true`. `isPlaying` flips to `true` via the existing native `play` event handler (already wired), so no double state writes.
- On rejection: log via the existing `console.error`, force `isPlaying: false` and `isPaused: false`, and return `false`.
- Same treatment for `resume()`: return `Promise<boolean>` so ChantPage's resume branch can react the same way. (Other callers ignoring the return value keep compiling unchanged.)

## 2. ChantPage: effect cleanup no longer pauses audio

In the playback effect (currently ends around line 612-620), remove the unconditional `engine.pause()` from the cleanup. Cleanup will only:

- clear the progress interval,
- remove the `canplaythrough` / `error` listeners,
- clear `engine.onEnded.current`,
- flip a local `cancelled` flag so pending async work cannot write state.

Pausing/stopping stays where it already is: `handlePlayPause`, `handleEndSession`, `stopAudio`, and the scroll/manual-change handlers.

## 3. ChantPage: await engine.play() with cancellation

Inside the effect, wrap the start in a local async function guarded by a per-run token:

```text
let cancelled = false;
(async () => {
  const ok = await engine.play(currentVerse.audio);
  if (cancelled) return;          // dashakam/verse/language changed or page left
  if (!ok) {
    setIsPlaying(false);          // do not show "playing"
    setIsPaused(true);            // keep verse; user can press Play again
    setVerseProgress(0);
    toast.error("Couldn't start audio. Tap Play to try again.");
  }
})();
```

- No retry loop: a failure simply stops and waits for the user.
- `highlightedVerse` is untouched on failure, so the current verse is preserved.
- The same `cancelled` guard is applied to the resume branch.
- Uses `sonner`'s `toast` (already the project's toaster); this is the only new import in ChantPage.

## Files modified

- `src/contexts/AudioContext.tsx`
- `src/pages/ChantPage.tsx`

## Verification

- TypeScript/build check after the edits; fix any resulting type errors (only the `Promise<void>` → `Promise<boolean>` signature is expected to ripple).
- Existing callers of `play()`/`resume()` in other pages (e.g. Podcast, script/sloka flows) are left as-is — a widened return type is backwards-compatible.

## Needs testing on a physical Android device

- Autoplay/gesture rejection: whether the failure toast appears instead of a silent stuck "playing" state on first tap.
- Background/lock-screen playback and Media Session controls after removing `engine.pause()` from cleanup (verify audio no longer cuts on language switch or re-render).
- Rapid verse/dashakam switching: confirm no double audio from an in-flight play request.
- Bell + sloka sequencing at prasadam verses remains identical.
