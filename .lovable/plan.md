# Paid Parayanam Star Badge

## What will change
- Add a small reusable gold star badge overlapping the bottom-right edge of the signed-in member’s avatar on desktop and mobile.
- Keep the avatar size, initial, account-menu action, and surrounding header layout unchanged.
- Show the badge only when the member has at least one confirmed contribution to a currently active PAID parayanam.

## Eligibility and text
- Read the signed-in member’s own participant rows where `contribution_status = 'confirmed'`.
- Keep only PAID sessions with no cancellation, no completion, and no expired end date, using today in `Asia/Kolkata`.
- Build the hint as `Paid for {parayanam_name}` and join multiple names with commas.
- Render nothing while there are no eligible names or the lookup fails.

## Interaction
- On desktop, reveal the hint on hover/focus.
- On mobile, tapping the star opens the same small hint and tapping elsewhere dismisses it, following the existing header notification interaction pattern.
- Keep taps on the avatar itself opening the existing account menu.

## Technical details
- Add one focused data hook for the current member’s eligible paid parayanam names.
- Add one compact badge component using the existing semantic gold/peacock tokens and Lucide `Star` icon.
- Attach the badge to both desktop and mobile avatar wrappers in `Layout.tsx`.
- Verify type safety and inspect the header at desktop and mobile widths without changing backend schema or policies.
