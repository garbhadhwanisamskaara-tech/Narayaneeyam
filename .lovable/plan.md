# Sync Bookmarks & Favourites to your account

## Where they are stored today

Both are **local-only**. There is no database table for either.

- Storage: browser `localStorage`, single key `narayaneeyam_progress` (`src/lib/progress.ts`).
- Inside that blob: `bookmarkEntries[]` (verseId, dashakam, verse, mode, savedAt) and `favouriteEntries[]` (verseId, dashakam, verse, sanskrit, language, savedAt).
- Hooks: `useBookmarks.ts`, `useFavourites.ts` — both read/write only localStorage.

Consequence: they vanish on reinstall, cache clear, or a different device/browser, and are not tied to the signed-in account.

## What changes

Move both to Cloud tables keyed by the signed-in user, keeping localStorage as an offline cache and as the source for a one-time migration.

1. Two new tables (`bookmarks`, `favourites`) with RLS so each user only sees their own rows.
2. `useBookmarks` and `useFavourites` rewritten to load from Cloud when signed in, write through on add/remove, and keep the same public API (`isBookmarked`, `addBookmark`, `removeBookmark`, `undoRemoveBookmark`, `mostRecent`, `favourites`, `isFavourited`, `addFavourite`, `removeFavourite`, `undoRemoveFavourite`, `randomFavourite`) so `ChantPage`, `HeartShelfPage`, `SavedPlacesPage`, and `DashboardCollectionCards` need no behaviour changes.
3. One-time migration on first signed-in load: any local entries not yet in Cloud are uploaded, then the local copy is marked migrated so it doesn't re-upload.
4. Signed-out users keep working exactly as today against localStorage.
5. Language scoping of favourites (`preferred_script_language`) is preserved — the `language` column stays and filtering stays client-side as it is now.

## Technical details

Tables (public schema, both with GRANTs to `authenticated` + `service_role`, RLS `user_id = auth.uid()` for select/insert/update/delete):

- `bookmarks`: `id uuid pk`, `user_id uuid not null`, `verse_id text`, `dashakam int`, `verse int`, `mode text`, `saved_at timestamptz`, unique `(user_id, verse_id)`.
- `favourites`: `id uuid pk`, `user_id uuid not null`, `verse_id text`, `dashakam int`, `verse int`, `sanskrit text`, `language text default 'en'`, `saved_at timestamptz`, unique `(user_id, verse_id, language)`.

Hook implementation: TanStack Query (already used across the app) with query keys `["bookmarks", userId]` / `["favourites", userId]`; optimistic local state update on add/remove so toasts and the Undo action feel instant; localStorage mirror updated in the same call so offline/refresh still shows the list. Migration runs once per device inside the hook's initial effect, guarded by a `bookmarksSyncedAt` / `favouritesSyncedAt` flag added to `UserProgress`.

Files touched: `src/hooks/useBookmarks.ts`, `src/hooks/useFavourites.ts`, `src/lib/progress.ts` (sync flags), plus one migration. Pages stay unchanged.
