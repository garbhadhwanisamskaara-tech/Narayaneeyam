# Account-synced Bookmarks & Favourites

## Goal

Bookmarks and Favourites move from browser-only storage to the signed-in account, so they survive reinstalls and follow the user across devices. Signed-out use keeps working exactly as today. Tapping a bookmark plays that exact verse from its beginning.

## What changes

1. **Cloud-backed hooks.** `useBookmarks` and `useFavourites` read from and write to the new `bookmarks` / `favourites` tables when signed in. Their public API is unchanged, so Chant, Heart Shelf, Saved Places and the dashboard cards need no edits.
2. **Signed-out path untouched.** No session, no cloud calls — localStorage exactly as today.
3. **One-time upload.** On the first signed-in load after this change, local entries not already in the account are uploaded, then a `bookmarksSyncedAt` / `favouritesSyncedAt` timestamp is written into `UserProgress` so it never re-uploads.
4. **Bookmark playback.** Tapping a bookmark navigates to that dashakam and verse and starts audio at the top of that verse, not at the start of the dashakam and not from wherever the player was.
5. **Optimistic updates.** The heart / ribbon toggles and toasts respond immediately; localStorage is updated in the same action so the list is correct offline and on refresh, with the cloud write reconciling behind it.

## Display text for favourites (note)

The new `favourites` table stores only `dashakam` + `verse` — no `sanskrit` text and no `language` column, which is the right call since script language lives on the profile. Consequence: a favourite created on another device has no saved text locally, so Heart Shelf will resolve its verse text from the verse data in the user's current `preferred_script_language` (and cache it in the local mirror). This is actually more correct than today — the text always matches the current preference rather than whatever was saved. Locally-created entries keep using their cached text, and language filtering stays client-side as it is now.

## Technical details

**Hooks** (`src/hooks/useBookmarks.ts`, `src/hooks/useFavourites.ts`)
- Session from `useAuth()`. When `user` is null: current localStorage code path, unchanged.
- When signed in: TanStack Query (`["bookmarks", userId]`, `["favourites", userId]`) selecting `id, dashakam, verse, saved_at` ordered by `saved_at desc`, mapped into the existing `BookmarkEntry` / `FavouriteEntry` shapes. `verseId` is derived as `${dashakam}-${verse}` to match how entries are keyed today; `mode` for cloud bookmarks defaults to `chant`.
- Add/remove: update React state and the localStorage mirror synchronously, then `insert` (`onConflict: user_id,dashakam,verse`, ignore duplicates) or `delete` matching `user_id + dashakam + verse`. On error, roll back state and toast a soft failure. `undoRemove*` re-inserts the same row.
- Cloud rows merge with the local mirror on load so offline entries stay visible until the fetch resolves.

**Migration** — inside the hooks' initial signed-in effect, guarded by the new `bookmarksSyncedAt` / `favouritesSyncedAt` fields added to `UserProgress` in `src/lib/progress.ts`. Bulk `upsert` of local entries with `ignoreDuplicates`, then stamp the flag.

**Bookmark playback** (`src/pages/SavedPlacesPage.tsx`, `src/components/DashboardCollectionCards.tsx`, `src/pages/ChantPage.tsx`)
- Continue links gain `&play=1` alongside the existing `dashakam` / `verse` params.
- `ChantPage` already resolves `?verse=` into a highlighted index via `pendingVerseRef`; that same effect will, when `play=1` is present, stop any current audio and start playback of the target verse from time 0 once its audio source is ready. The flag is consumed once so a later manual pause/seek is not overridden.

**Files touched:** `src/hooks/useBookmarks.ts`, `src/hooks/useFavourites.ts`, `src/lib/progress.ts`, `src/pages/ChantPage.tsx`, `src/pages/SavedPlacesPage.tsx`, `src/components/DashboardCollectionCards.tsx`, plus a small helper for verse-text resolution used by Heart Shelf. No schema migration needed — the tables and RLS already exist.
