Goal: Make the Progress page reachable from the desktop header (it is already in the mobile bottom nav), and replace the feather reward visuals with a proper peacock-feather SVG icon.

## What I found
- The desktop header navigation in `src/components/Layout.tsx` only shows Home, Chant, Podcast. The mobile bottom nav (`src/components/BottomNav.tsx`) already shows Progress.
- The Feather Shelf in `src/components/FeatherShelf.tsx` already has a local `PeacockFeather` SVG, but it is very abstract and the Dashboard stat card still uses the generic `lucide-react` `Feather` icon.

## Proposed changes

1. **Add Progress to the desktop header nav**
   - Add `BarChart3` to the `lucide-react` import in `src/components/Layout.tsx`.
   - Add `{ path: "/progress", label: "Progress", icon: BarChart3 }` to the `navItems` array so the desktop header shows a "Progress" link with the same icon/label used on mobile.
   - The same `navItems` array is also used for the mobile hamburger menu, so Progress will appear there too; the bottom nav already has it, making the navigation consistent across all breakpoints.

2. **Create a shared peacock-feather SVG icon component**
   - Create `src/components/icons/PeacockFeatherIcon.tsx` containing a detailed, stylized peacock-feather SVG.
   - The SVG will use `currentColor` for its main stroke/fill so it automatically matches the theme color classes passed in (e.g., `text-feather-chant`, `text-secondary`, `text-primary`).
   - Include `aria-hidden="true"` and a `title` prop so the icon is accessible when used as a meaningful image.

3. **Replace feather visuals everywhere they appear**
   - In `src/components/FeatherShelf.tsx`, replace the local `PeacockFeather` SVG with the new `PeacockFeatherIcon` component.
   - In `src/pages/DashboardPage.tsx`, replace the generic `lucide-react` `Feather` icon in the "Feathers Earned" stat card with `PeacockFeatherIcon`, and remove the unused `Feather` import.
   - Keep the existing mode colors (`text-feather-chant`, `text-feather-learn`, `text-feather-podcast`) and the secondary color used in the Dashboard stat card.

## Files modified
- `src/components/Layout.tsx` — add Progress to the desktop nav.
- `src/components/FeatherShelf.tsx` — use the shared peacock-feather icon.
- `src/pages/DashboardPage.tsx` — use the peacock-feather icon in the Feathers Earned card.

## New files
- `src/components/icons/PeacockFeatherIcon.tsx` — reusable peacock-feather SVG icon.

## Technical notes
- No new npm packages or dependencies are needed.
- No data/schema changes are needed.
- The icon remains a vector, so it stays crisp on all screen sizes and supports the existing Tailwind `text-*` color classes.
- This change does not affect fonts, colors, or other navigation items; it only adds the missing Progress link and updates the feather icon.