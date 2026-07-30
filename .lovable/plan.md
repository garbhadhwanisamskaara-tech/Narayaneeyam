# Plan: Respect `is_published` in Dashakam selection lists

## Goal
Only Dashakams marked `is_published = true` in the `dashakams` table should appear in user-facing lists used to build playlists, choose a Dashakam to chant/listen to, or schedule a parayanam.

## Current state
- `is_published` exists on `public.dashakams` and is editable in `AdminUploadPage.tsx`.
- `useDashakam.ts` fetches all rows matching `language_code` without selecting or filtering `is_published`.
- The playlist builder, chant page, podcast page, and parayanam creation page all render the full 1–100 range or unfiltered rows.

## Changes

### 1. Data model (`src/hooks/useDashakam.ts`)
- Add `is_published: boolean` to `DashakamListItem`.
- In `fetchDashakamListForLang`, include `is_published` in the select and add `.eq("is_published", true)`.
- Update the fallback `DASHAKAM_SEED` to include `is_published: true` so the seed still works.
- Ensure `getDashakamName` and `prefetchDashakamList` use the same filtered list.

### 2. Hook consumers
- `useDashakam` already returns `dashakamList`; after the change it will contain only published Dashakams. Components that read it will automatically get the filtered list.
- `useDashakamSets.ts`: filter each set’s `dashakam_list` array to only numbers that are present in the published list. Official sets can therefore be partially hidden if some Dashakams are unpublished.

### 3. UI updates
- `src/components/PlaylistBuilder.tsx`: replace the hardcoded `Array.from({ length: 100 }, ...)` grid with the published `dashakamList`. Update "Select All" to select only published Dashakams. Show an empty state if none are published.
- `src/pages/ChantPage.tsx`: drive the Dashakam dropdown from `dashakamList` (published only). If a URL points to an unpublished Dashakam, redirect to the first published one or show a message.
- `src/pages/PodcastPage.tsx`: filter the `podcastData` entries so only Dashakams that are also published can be selected or auto-advanced to.
- `src/pages/CreateParayanamPage.tsx`: drive the custom 1–100 selector from published `dashakamList` instead of the hardcoded `ALL` array.
- `src/pages/ChallengeCreationPage.tsx`: check for any custom Dashakam selector and apply the same filter.

### 4. Edge cases
- Preserved playlists/parayanams that contain unpublished Dashakams will still play them (do not break existing user data). The filter applies only to **selection lists**.
- If no Dashakams are published, show a clear empty state with a message like "No Dashakams are available yet."
- The `is_published` flag should be language-agnostic: a Dashakam is either published or not; filtering on the English row is sufficient.

## Files to modify
- `src/hooks/useDashakam.ts`
- `src/hooks/useDashakamSets.ts`
- `src/components/PlaylistBuilder.tsx`
- `src/pages/ChantPage.tsx`
- `src/pages/PodcastPage.tsx`
- `src/pages/CreateParayanamPage.tsx`
- `src/pages/ChallengeCreationPage.tsx` (audit only; modify if it has a selector)

## No new files
All work is done in existing components/hooks.