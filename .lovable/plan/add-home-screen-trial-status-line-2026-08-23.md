# Add Home-screen trial status line

## Goal
Show a quiet, informational status line on the Home screen just below the existing "Need help with your account or chanting? / Raise Ticket" strip. It displays the featured plan price struck through and the user's trial end date.

## What will change

1. **New component: `src/components/TrialStatusLine.tsx`**
   - Reads the current user from `useAuth`.
   - Fetches the active featured plan from `subscription_plans` (`is_active = true` and `is_featured = true`), selecting `price_inr` and `duration_label`.
   - Only renders when the user is on an active trial (`profile.subscription_status === "trial"` and `profile.subscription_end` exists and is in the future).
   - Formats the price as `₹{price_inr.toLocaleString('en-IN')}/{duration_label}` with `line-through` and muted color.
   - Formats the trial end date as `DD MMM YYYY` (e.g. `31 Dec 2026`) using `toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })`.
   - Full text: `<s>₹1,299/year</s> — you're on free trial till 31 Dec 2026`
   - No link, no button, no tap action.
   - Center-aligned, small text (`text-[11px] sm:text-xs`), allows natural wrapping on narrow screens.
   - Uses existing theme colors (`text-muted-foreground` / `text-secondary-foreground`), no new palette.

2. **Update `src/pages/Index.tsx`**
   - Import and render `<TrialStatusLine />` as the first element inside the page content (after `<SEO />`), so it appears below the global `SubscriptionBanner` strip and only on the Home route.
   - Add minimal vertical spacing so it is not cramped or overlapping on mobile/desktop.

## Out of scope
- No changes to `SubscriptionBanner.tsx` or the existing support strip.
- No changes to `SUBSCRIPTION_ENABLED` flag behavior.
- No navigation/payment logic.

## Verification
- Run the production build (`bun run build`) and confirm no TypeScript errors.
- Visually check the Home screen on mobile and desktop previews for overlap/clipping.
