# Fix: Garden shows stale "bud" state only in the TWA (Android app)

## Root cause (confirmed by reading `public/sw.js`)

The data fix from before (loading every member's blooms in `useSessionGarden.ts`) is correct — but the TWA never runs that new code.

`public/sw.js` serves same-origin static files (including the app's `.js` bundles) **cache-first, forever**:

```text
TWA opens app
   -> service worker checks SHELL_CACHE ("narayaneeyam-shell-v1")
   -> old JS bundle found in cache  ->  served immediately, network never asked
   -> TWA keeps running the OLD code with the bloom-loading bug
```

The webapp picked up the fix because its cache was filled more recently / refreshed; the TWA installed the app shell earlier and has been stuck on the stale bundle since. The cache name is also fixed at `-v1` and old caches are never deleted, so even a new `sw.js` would keep the old entries.

## Changes (one file: `public/sw.js`)

1. **Bump the cache name** (e.g. `narayaneeyam-shell-v2`) so the old poisoned cache is abandoned.
2. **Delete old caches on `activate`** — remove every cache whose name starts with `narayaneeyam-shell-` but isn't the current one.
3. **JS/CSS become network-first** (with cache fallback for offline) instead of cache-first. New deploys reach the TWA on the next launch; offline still works from cache. Images/icons/audio stay cache-first (they never change in place).
4. Push/notification handlers stay exactly as they are.

## One-time step for affected TWA users

Because the *old* service worker is what decides what to serve, the fixed `sw.js` reaches the TWA automatically on its next check (browser checks for a new sw.js on launch) — after the update activates, old caches are wiped and fresh code loads. Worst case: closing and reopening the app once or twice, or clearing the app's storage, resolves it immediately.

## No other files touched

`useSessionGarden.ts` pagination fix stays as-is; garden layout is identical on web and TWA — the TWA was simply running older JavaScript.
