# PWA Foundation Fix

## Goal
Make the web app installable by linking the manifest and touch icon, aligning theme colors, correcting the manifest `start_url`, and adding a minimal app-shell fetch handler to the existing push service worker. No install-prompt UI, authentication, playback, parayanam, or subscription logic will be touched.

## Current State Verified
- `index.html` has no `<link rel="manifest">` and no `<link rel="apple-touch-icon">`; `theme-color` is `#1B4F72`.
- `public/manifest.json` exists but uses `start_url: "/?source=twa"`.
- `public/sw.js` only handles push/notification events; no `fetch` handler.
- `public/icons/icon-192.png` exists.
- No `vite-plugin-pwa` or other PWA build plugin is installed.

## Changes

### 1. `index.html` head updates
- Add `<link rel="manifest" href="/manifest.json">`.
- Add `<link rel="apple-touch-icon" href="/icons/icon-192.png">`.
- Change `<meta name="theme-color" content="#1B4F72">` to `content="#0B6679"` to match `manifest.json` and the TWA config.

### 2. `public/manifest.json`
- Change `start_url` from `"/?source=twa"` to `"/"`.
- Leave the separate TWA config (`assetlinks.json` / twa-manifest, if present) untouched.

### 3. `public/sw.js` — add minimal fetch/app-shell caching
Keep all existing push code exactly as-is. Add a `fetch` event listener that:
- Opens/creates a cache named `narayaneeyam-shell-v1` on install (using the existing `install` event).
- On `fetch`:
  - For same-origin navigation requests (`request.mode === 'navigate'`): try network first, fall back to cached `/index.html` if offline.
  - For same-origin static assets (JS, CSS, PNG, JPG, SVG, JSON, ICO, MP3, WEBM, WASM): cache-first — serve from cache if present, otherwise fetch and cache a clone.
  - For everything else (cross-origin, API, etc.): pass through to network unchanged.
- Pre-cache `/`, `/index.html`, `/manifest.json`, `/favicon.png`, and `/icons/icon-192.png` during `install`.
- Limit cache size by storing only same-origin resources and skipping opaque/cross-origin responses.

This is foundation-only: it enables basic offline app-shell behavior without building an install banner or eligibility logic.

## Out of Scope
- No install-prompt UI or "Add to Home Screen" trigger logic.
- No changes to authentication, audio playback, parayanam, subscriptions, or database code.
- No migration to `vite-plugin-pwa`.

## Verification
- Build the project and confirm no TypeScript/build errors.
- Inspect `index.html` in the dev preview to confirm manifest and apple-touch-icon links are present and `theme-color` is `#0B6679`.
- Confirm `manifest.json` is served with `start_url: "/"`.
- Confirm `public/sw.js` still contains all original push/notification code and additionally registers a `fetch` handler.
