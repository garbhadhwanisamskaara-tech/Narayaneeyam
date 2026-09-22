# Merge Help and Settings in the More menu

## Changes
- Replace the separate “Help & Support” and “Settings & Guide” entries with one “Help & Settings” entry using the Settings icon.
- Keep “Guided Journeys” clearly present near the top of the menu in the freed slot.
- Route “Help & Settings” to the existing Settings & Guide page (`/user-guide`).
- Add a clear “Help & Support” link on that page so the existing support page remains directly reachable.
- Preserve both existing routes and all unrelated menu items, ordering, styling, and behavior.

## Verification
- Check that the More menu shows one combined entry and still shows Guided Journeys.
- Check that Help & Settings opens the guide and its support link opens Help & Support.
- Run the existing TypeScript checks and focused tests.
