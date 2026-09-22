# Guided Journey timing and floating Home prompt

## Scope

Update only the Guided Journeys frontend. Keep the existing database schema, RLS, RPC, Parayanam prompt, and non-Journey behavior unchanged.

## Implementation

1. **Correct journey day calculation**
   - Change the shared calendar-day helper so dates before `effective_start_date` return day `0`.
   - Preserve the existing upper cap at `duration_days` for callers that only need the unlocked-day number.
   - Add focused tests for before-start, first-day, in-progress, and after-duration calculations.

2. **Expose the enrolled run and cycle state**
   - Extend the journey data hooks to resolve the run referenced by the current enrollment, including its `start_date`, `end_date`, and `status`.
   - Derive four frontend states from calendar dates: not started, active day, grace, and closed. Runs without `end_date` remain self-paced and never enter grace or closed.
   - For a closed enrollment, find another `OPEN` or `ACTIVE` run for the same journey, excluding the closed run.

3. **Update the journey dashboard**
   - Before start: show `Starts {date}` and keep the task/checkmark area hidden.
   - Active day: retain today’s existing task, action, reflection, and completion behavior.
   - Grace: hide the “today” task and present all unlocked, incomplete days with their existing content/action and a manual completion control, so missed days remain completable.
   - Closed: hide journey progress/task controls. If another eligible run exists, show its date and a join action; otherwise show “This cycle has ended.”
   - Prevent `openDay` and completion writes for day `0` or a closed run.

4. **Replace the inline Journey Home card**
   - Add `JourneyHomeFloatingPrompt` beside the other Journey components and move the existing RPC fetch, join, analytics, and permanent dismissal behavior into it.
   - Render it as a fixed compact overlay: above the mobile BottomNav and safe-area inset, and at the lower-right on larger screens.
   - Use `z-40`, below BottomNav and modal layers. The current PWA prompt is inline above page content, so no extra collision offset is needed.
   - Make the prompt body navigate to `/journeys/:slug`; keep the X isolated so dismissal never navigates or joins.
   - Replace only the Journey prompt section in Home. Leave `SelfJoinParayanamPrompt` exactly where and how it is.

5. **Verification**
   - Run the Journey helper tests and the existing test suite/typecheck.
   - Check Home at mobile and desktop sizes for BottomNav clearance, safe-area spacing, dismissal, and no overlap.
   - Check dashboard rendering for future-start, active, grace, closed-with-alternate, closed-without-alternate, and self-paced runs using available fixtures/mocks; authenticated live-data checks remain dependent on suitable account data.

## Technical notes

- Date comparisons will use plain `YYYY-MM-DD` calendar values consistently, avoiding time-of-day drift.
- No migration, policy, RPC, generated type, or database-content changes are included.
