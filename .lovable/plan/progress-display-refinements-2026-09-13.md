# Progress display refinements

## Changes
- Move each Progress metric’s info icon directly beside its label, including the three rows inside “This Year.”
- Remove the Progress-only Daily Parayanam card and the duplicate Insights section, without changing those components elsewhere.
- Add one shared compact parayanam lotus component that calculates its own bloom percentage from completed and total dashakams, uses the existing lotus shape, renders it in the gold theme token, and shows the requested progress tooltip.
- Use that shared gold lotus beside parayanam names in the Progress “My Parayanams” rows and the full My Parayanams list, while preserving the existing count text.
- Replace the Feathers Earned visual with the supplied transparent peacock feather image at the existing icon scale.

## Technical details
- Extend the existing Lotus component with an optional semantic color mode; individual dashakam lotuses remain unchanged.
- Keep all calculations read-only and based on the report data already loaded by the page.
- Do not change schemas, queries, writes, authentication, payment, chanting, group, or scheduling behavior.

## Verification
- Run the existing TypeScript checks and focused tests.
- Inspect the Progress page at desktop and mobile sizes when authenticated preview access is available.
