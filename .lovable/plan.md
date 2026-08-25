# Remove orphaned personal-parayanam page

## Step 1 findings — confirmed unreachable

Searched the whole `src/` tree for literal paths, template-literal navigation, redirects and component usage:

- `/challenges/new` appears in exactly two places: the route definition in `src/App.tsx` (line 97) and the page's own SEO `path` prop inside `ChallengeCreationPage.tsx`. No `Link`, `navigate()`, or `<Navigate>` anywhere points to it.
- Every dynamic navigation call in the app was reviewed (all template-literal `to={...}` / `navigate(\`...\`)` sites). None constructs a `/challenges/...` path; the only `/challenges/*` sibling route is `/challenges/sankalpa`, reached separately and unaffected.
- Personal creation entry points all go to `/parayanam/new` (e.g. `ActiveChallengeCard.tsx`, `GroupDetailPage.tsx`), matching your description.
- `BudGrid.tsx` has exactly one consumer: `ChallengeCreationPage.tsx`. The group progress view uses `useSessionGarden` / `DashakamGarden` instead.
- No references in `public/sitemap.xml`, `robots.txt`, or docs pages.

Conclusion: both files are dead code and safe to remove.

## Step 2 — deletions

1. Delete `src/pages/ChallengeCreationPage.tsx`.
2. Delete `src/components/BudGrid.tsx`.
3. In `src/App.tsx`, remove the `ChallengeCreationPage` import (line 58) and the `/challenges/new` route (line 97). Leave `/challenges/sankalpa` untouched.

No other imports are left dangling: the hooks BudGrid used (`useCompleteDashakam`, `useSessionParticipants`) and the ones the page used (`useDashakamSets`, `useParayanamSchedule`, `prefetchDashakamList`) all have other live consumers, so those hook files stay.

Verification after removal: typecheck passes and the app has no remaining reference to either file.
