# Cleanup: Remove Feathers Earned tile + dead code verification

## Current-state confirmation

1. **Feathers Earned tile** — exists in `src/pages/DashboardPage.tsx` at lines 166-180. It displays `feathersEarned` (derived from `useFeathers()`) with a `PeacockFeather` icon.
2. **Dead code in `src/lib/supabaseProgress.ts`** — already absent. `updateStreakSupabase()` only writes to `localStorage`; `recordListeningTimeSupabase()` is a no-op with a comment noting the target table does not exist. No `chant_sessions` inserts remain in source code.
3. **`markVerseCompleted()`** — already absent from the entire codebase. The only remaining `chant_sessions` references are in `public/docs/DB_SCHEMA.md` (documentation only).

## Changes to make

1. **`src/pages/DashboardPage.tsx`**
   - Remove the "Feathers Earned" tile block (lines 166-180).
   - Remove the now-unused imports: `PeacockFeather` and `useFeathers`.
   - Remove the now-unused variable `feathersEarned`.
   - Leave `awardFeather()` call in `useMemberProgress.ts` untouched, as requested.

2. **Verification**
   - Run the TypeScript/Vite build to ensure no unused-import or type errors after the cleanup.

## Out of scope

- No database migrations.
- No changes to `useMemberProgress.ts`, `useFeathers.ts`, or the feathers table logic.
- No edits to `public/docs/DB_SCHEMA.md`.
