# Make trial initialisation cover 'free' profiles

## What the code says today (verified)

- `src/contexts/AuthContext.tsx` line 36: `isTrialStatus(status)` returns true **only** for `null` or `"trial"`. The string `"free"` is not recognised anywhere in the app.
- `initialiseNewProfile()` (line 125) is the only place that sets `subscription_status = 'trial'`, `subscription_start`, and `subscription_end` (fixed `2026-12-31T23:59:59+05:30`). It runs only when `isTrialStatus(...)` is true, `subscription_end` is null, and the auth metadata flag `trial_initialised !== "1"`.
- Consequence: a profile that arrives with `subscription_status = 'free'` never enters that branch, so `subscription_plan_id` and `subscription_end` stay null forever.

## Functional difference

| | `'trial'` (+ end date) | `'free'` (null plan/end) |
|---|---|---|
| Access | granted until end date + 7-day grace, then `isAccessLocked` redirects to `/trial-expired` | never locked — `accessEndsMs` is null so `graceApplies` is false: unlimited access |
| Home trial line | shown (`TrialStatusLine.tsx` requires status `=== "trial"`) | hidden |
| Subscription banner | trial messaging | treated as a non-trial plan; shows nothing meaningful |
| Renewal maths | edge functions extend from `subscription_end` | falls back to "now" |

So `'free'` is not a designed state — it is an unhandled one. Functionally those users have permanent free access and no trial UI.

## Why 469 profiles are in that state — unconfirmed

The likely cause is that the row is created server-side (a `handle_new_user` trigger or a column default on `public.profiles`) with `subscription_status` defaulting to `'free'`, which the client-side initialiser then skips. That trigger/default is **not** in this repo's migrations, so step 1 below is to confirm it against the live database before changing anything.

## Plan

1. **Confirm the source.** Inspect the live `public.profiles` definition and any `auth.users` insert trigger for the default that writes `'free'`. Also confirm the 469 rows all have null `subscription_plan_id` and null `subscription_end`.
2. **Fix the origin.** Change the column default / trigger so new signups get `subscription_status = 'trial'`, the trial plan id, and the fixed trial end date at row-creation time — server-side, not dependent on the client ever loading.
3. **Make the client tolerant.** Treat `'free'` as a trial-eligible status in `isTrialStatus()` so any profile that still lands in that state gets initialised on next login instead of being ignored.
4. **Backfill.** One migration updating existing profiles with `subscription_status = 'free'` (and null end date) to `trial` / trial plan id / `2026-12-31T23:59:59+05:30`, leaving paid and paused rows untouched.
5. **Verify.** Confirm the trial line appears on Home for a backfilled account and that no paid account's `subscription_end` was altered.

## Notes

Step 4 changes 469 users from "unlimited, invisible" to "on trial until 31 Dec 2026" — same practical access until that date, but now visible in the UI and correctly gated afterwards.
