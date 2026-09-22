# Fix the desktop tile grid: merge Help & Settings, add Guided Journeys

## Why it looks different on desktop

The earlier change was made to the mobile "More" sheet only. The grid you see on the wide screen is a different list — the tiles on the Home page — and it still has the old entries. That is why the two help tiles are still separate and Guided Journeys is missing there.

Also note: your screenshot is the live published site. Even after this fix, the published site only updates when you publish again.

## Changes (Home page tile list only)

1. Add a **Guided Journeys** tile (opens /journeys), placed second in the list, right after Script Library — matching the order used in the mobile menu.
2. Replace the two tiles **Help & Support** and **Settings & Guide** with one tile: **Help & Settings**, gear icon, opening the guide page (which already links to Support). The FAQ tile stays as it is.
3. Both pages remain reachable; no routes removed.

## Technical detail

Edit `moreFeatures` in `src/pages/Index.tsx`: add `{ path: "/journeys", icon: Footprints, title: "Guided Journeys", desc: ... }` after the Script Library entry, drop the `/support` entry, and change the `/user-guide` entry's title to "Help & Settings" with a description covering help plus preferences. Add the `Footprints` icon import. No other file or logic changes.
