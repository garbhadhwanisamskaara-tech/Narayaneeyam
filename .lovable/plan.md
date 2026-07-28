## Problem

Dissolving works on the backend — `dissolve-group` sets `groups.status = 'dissolved'`, marks all `group_members.left_at`, and cancels sessions. But the frontend never checks `status`, so the group keeps appearing.

Confirmed in the code:
- `src/hooks/useGroups.ts` — the owned-groups query (`.eq("owner_id", user.id)`) has no status filter, so the owner keeps seeing the dissolved group on `/groups`. (Non-owner members drop off correctly because their `left_at` is set.)
- `src/pages/GroupDetailPage.tsx` — selects `status` but never acts on it, so `/groups/:id` for a dissolved group still renders as a normal group page.
- `src/pages/JoinGroupPage.tsx` — no status handling; an old invite link to a dissolved group could still attempt a join.

## Changes

1. **`src/hooks/useGroups.ts`**
   - Add `.neq("status", "dissolved")` to the owned-groups query and to the `.in("id", memberIds)` joined-groups query, so dissolved groups never enter the list.

2. **`src/pages/GroupDetailPage.tsx`**
   - After loading the group, if `status === 'dissolved'`, render a simple "This group has been dissolved" message with a link back to `/groups` instead of the members/blooms/danger-zone UI.

3. **`src/components/GroupDangerZone.tsx`**
   - On successful dissolve, navigate to `/groups` (already does) — no change needed beyond making sure the groups list refetches on mount, which `useGroups` does via its `useEffect`.

## Notes

No database or edge-function changes. Purely client-side filtering of already-correct backend state.
