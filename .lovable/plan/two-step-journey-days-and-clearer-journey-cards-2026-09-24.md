# Two-step journey days and clearer journey cards

## Changes
- Extract the existing day task markup into `JourneyDayCard.tsx` without changing its current single-action appearance or completion control.
- Extend `JourneyDay` with the three optional secondary-action fields now returned by the database.
- Generalize the existing journey action resolver so both primary and secondary actions use the same switch logic.
- When a day has a secondary action, show “Step 1 of 2” and “Step 2 of 2” with one action button under each; keep the whole-day completion checkbox below both.
- Extract the existing `/journeys` list item into `JourneyCard.tsx`, preserving the full-card link and adding “View journey” with a right-facing chevron at the bottom.
- Keep all unrelated journey timing, enrollment, completion, and list behavior unchanged.

## Verification
- Run focused TypeScript and test checks through the project harness.
- Verify single-action days remain unchanged, two-step days show both actions, and every journey list card shows the new affordance.
