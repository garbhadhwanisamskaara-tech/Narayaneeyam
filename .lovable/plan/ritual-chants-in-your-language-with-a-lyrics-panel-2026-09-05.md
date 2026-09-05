# Ritual chants in your language, with a lyrics panel

## What changes

1. **Ritual chants follow your saved lyrics language.** The chanting screen currently always loads the opening, dashakam-closing and session-closing chants in English. It will instead use the lyrics language saved in My Preferences, so all three ritual moments appear in the language you chose.

2. **A "Lyrics" button on the ritual screen.** While any ritual chant is playing, a small scroll-icon "Lyrics" button sits beside the existing play/mute/speed controls.

3. **A side panel with the text.** Tapping it slides a panel in from the right that scrolls on its own. Audio keeps playing exactly as before — opening or closing the panel never interrupts it.

4. **What the panel shows.**
   - Opening ritual: all opening chants, one after another in their existing order, separated by dividers.
   - Dashakam closing: just that chant.
   - Session closing: just that chant.
   Each entry shows the chant name in bold with its text below, keeping original line breaks.

5. **Language fallback per chant.** If a chant has no text in your language, that one chant falls back to English while the others stay in your language. If a chant has neither, it is simply left out — no placeholder, no loading state, and the panel still opens instantly.

## Technical notes

- `src/pages/ChantPage.tsx`: replace `useRitualChants("en")` with `useRitualChants(translitLang)`, where `translitLang` is the `scriptLang` already destructured from `useLanguagePrefs()` at line 93.
- `src/hooks/useRitualChants.ts` already selects all `ritual_chant_scripts` rows per chant and resolves preferred-language-then-English per chant, so `RitualChant.transliteration_text` / `ritual_chant_name` on the `chants` prop already carry the correct fallback. No extra fetching or loading state is needed in the overlay.
- `src/components/RitualChantOverlay.tsx`: add local `lyricsOpen` state, a `ScrollText`-icon button in the existing controls row, and a shadcn `Sheet` with `side="right"` and `overflow-y-auto max-h-screen` content. Render `chants.filter(c => c.transliteration_text)` — since the prop already holds exactly the current phase's chant(s), phase branching is implicit. Each section: bold `ritual_chant_name`, then `transliteration_text` with `whitespace-pre-line`, divider between sections.
- The Sheet mounts alongside the existing audio element; no changes to the audio effect, so playback is untouched.
