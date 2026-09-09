# Fix missing member names in large groups

For groups with hundreds of members, the app asks the database for every name in one giant request. That request is too long to succeed, so it fails quietly and every person shows up as "Member" — even the group owner.

## What changes

1. **Ask for names in batches.** Instead of one request for 400-800 people, send several smaller requests (100 people each) at the same time and combine the answers into one list of names.
2. **Show a problem when there is one.** If any batch fails, the screen shows a short message ("We couldn't load member names. Try again.") with a Try again button, instead of silently showing "Member" for everyone.
3. Applies to both places that load member names: the Guru's participant list for a parayanam, and the group members list.

## Technical details

- Add a shared helper (`src/lib/profileNames.ts`) exporting `fetchProfileNames(ids: string[]): Promise<Map<string, string>>`:
  - de-duplicates ids, chunks into groups of 100,
  - runs `supabase.from("profiles").select("id, display_name, email").in("id", chunk)` for all chunks via `Promise.all`,
  - throws if any chunk returns an error (so callers can surface it),
  - merges into a single `Map<id, display_name ?? email ?? "Member">`.
- `src/components/ParayanamParticipantManager.tsx` (~lines 76-85): replace the inline `.in("id", ...)` lookup with `fetchProfileNames`. Wrap in try/catch; on failure set the existing `error` state via `friendlyError(...)` with fallback "We couldn't load member names. Please try again." and render a "Try again" button that calls `load()`.
- `src/hooks/useGroups.ts` `useGroupMembers` (~lines 168-179): same replacement; on failure set the hook's `error` state and keep `refresh()` available for retry. `GroupsPage`/`GroupDetailPage` consumers already read `error`; add a retry button where the members list is rendered if none exists.
- No schema, RLS, or query-shape changes — only how many ids go per request.
