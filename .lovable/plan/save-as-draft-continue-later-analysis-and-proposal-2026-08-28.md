# Save as Draft / Continue Later — analysis and proposal

Analysis first, as requested. No code has been changed.

## A. Files and components involved

Creation wizard (single component, 991 lines, ~20 `useState` values, dynamic step list
`details → mode → [contribution] → [distribution] → [live] → [participants] → review`):

- `src/pages/CreateParayanamPage.tsx` — all state, validation (`canNext`), footer nav, `handleSubmit`
- `src/components/ParayanamModeSelector.tsx`, `ParticipationTypeSelector.tsx`,
  `ContributionDetailsForm.tsx`, `LiveScheduleEditor.tsx`, `ParticipantPicker.tsx`,
  `ParayanamReview.tsx` (all pure/presentational — no data fetching)
- Dashakam set / template / custom selection is inline JSX inside the wizard (lines 443–576),
  fed by `useParayanamTemplates`, `useDashakamSets`, `prefetchDashakamList()`

Display and management:

- `src/hooks/useGroupParayanams.ts` — group parayanam list (RPC `get_group_parayanams` + client-side
  `technical_state` filter)
- `src/pages/GroupDetailPage.tsx` — group page, calls `finalize_parayanam` RPC ("Start Now")
- `src/lib/parayanamFilters.ts` — `HIDDEN_SESSION_STATES = ["ARCHIVED","CANCELLED"]`
- `src/hooks/useGroupActiveSessions.ts`, `useMyDashakamQueue.ts`, `useUpcomingLiveSessions.ts`,
  `useChallengeSessions.ts` — all already filter by `technical_state`
- `src/components/ManageParayanamDialog.tsx` — rename / invite / remove participant / cancel

There is currently **no draft concept and no localStorage persistence** anywhere in the wizard —
state is in-memory only and lost on refresh.

## B. Existing columns that can already store draft data

`challenge_sessions` already holds, from the create insert: `user_id`, `group_id`,
`parayanam_name`, `mode`, `delivery_mode`, `participation_type`, `contribution_amount`,
`payment_url`, `payment_note`, `challenge_type`, `distribution_mode`, `schedule_pattern`,
`schedule_weekdays`, `same_for_all_per_day`, `schedule_overrides`, `start_date`, `end_date`,
`technical_state`, `spiritual_state`, `dashakams_target`, `dashakam_list`, `dashakam_set_id`.

That covers group, name, dashakams/set, dates, distribution, self-paced vs live, contribution
settings, payment link and remarks.

## C. Fields that cannot be stored today

1. **Current wizard step** — no column.
2. **Selected participants (not yet invited)** — participants only exist as real
   `parayanam_participants` invitation rows, which a draft must not create.
3. **"I'm also chanting" (includeSelf)** — no column.
4. **Live-session configuration entered so far** — `live_sessions` rows are the only store, and a
   draft must not create them (they carry meeting links and feed Upcoming Live Sessions).
5. **Selected template id** and partially-entered contribution text before validation.
6. `start_date` / `end_date` are written on every create and are very likely `NOT NULL`; a draft
   saved on step 1 may not have them yet.

Rather than adding six columns and relaxing NOT NULL constraints, the minimal safe change is a
single `draft_state jsonb` column holding the whole wizard snapshot while the row is a draft.

## D. Existing `technical_state` constraint — UNVERIFIED

The `challenge_sessions` table is not defined in `supabase/migrations/` in this repo (only later
`ALTER TABLE` migrations exist), and this project uses an external Supabase project that I cannot
query from here. So I cannot state today whether `technical_state` has a CHECK constraint or what
values it allows. Known values in use in code: `ACTIVE`, `ARCHIVED`, `CANCELLED`.

First step of implementation will be to run this and act on the result:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.challenge_sessions'::regclass and contype = 'c';
```

## E. Where schedule generation happens

- Group parayanams: **not** at creation. `finalize_parayanam()` (RPC, called from
  `GroupDetailPage.tsx:276`) builds `parayanam_schedule` rows.
- Personal parayanams: direct `parayanam_schedule` insert in `handleSubmit`
  (`CreateParayanamPage.tsx:348-356`) from `buildSchedule()` output.
- `buildSchedule()` in `src/hooks/useParayanamSchedule.ts` is a pure preview function.

## F. Where invitations get created

`inviteParticipants()` in `src/hooks/useParayanamParticipants.ts:39-74` (deletes then inserts
`parayanam_participants`). Called from `CreateParayanamPage.tsx:346` and
`ManageParayanamDialog.tsx:151`.

## G. Proposed minimal implementation

1. **DB**: allow `DRAFT` in `technical_state` (only if a CHECK constraint exists), add
   `draft_state jsonb` to `challenge_sessions`, and add owner-only RLS for draft rows.
2. **Wizard**: add `Save as Draft` between Back and Next/Create in the existing footer (outside the
   scrollable participant list). It upserts one `challenge_sessions` row with
   `technical_state='DRAFT'` plus `draft_state` = the full wizard snapshot; the row id is kept in
   component state so repeated saves UPDATE the same row (no duplicates).
3. **No side effects for drafts**: `Save as Draft` never calls `inviteParticipants`, never inserts
   `parayanam_schedule` or `live_sessions`, never touches `groups.active_challenge_session_id`,
   never sends notifications.
4. **Resume**: `/groups/:id/parayanam/new?draft=<id>` (existing route + query param) loads the row,
   hydrates every wizard state value from `draft_state`, and jumps to the saved step.
5. **Final creation**: on `Create Parayanam`, if a draft id exists, UPDATE that row to the exact
   same field set the current insert writes (`technical_state='ACTIVE'`, `draft_state = null`)
   instead of inserting a new one; everything after that point (`inviteParticipants`, schedule,
   live sessions, active session pointer, toast, navigate) is the existing untouched code path.
6. **Hiding drafts**: add `DRAFT` to `HIDDEN_SESSION_STATES` in `src/lib/parayanamFilters.ts` so
   every existing consumer (queue, live sessions, group active sessions, member views) ignores
   drafts with no per-file changes. The group page then fetches the owner's drafts separately.
7. **Group page**: a "Drafts" block, owner-only, each showing name or "Untitled Parayanam", a
   `DRAFT` chip, "Setup incomplete", `Continue Setup`, and `Discard Draft` with the confirmation
   text "Discard this draft Parayanam? This cannot be undone." Discard deletes only that
   `challenge_sessions` row (a draft has no child rows by construction).
8. **UX**: after saving, a toast "Parayanam saved as draft. You can continue setup later." with
   the choice to continue editing or return to the group.

Existing ACTIVE parayanams, participants, schedules, gardens, My/Full Schedule, Manage Parayanam,
live sessions and payment confirmation are untouched.

## H. Files to modify

- `src/pages/CreateParayanamPage.tsx` — draft id state, save-draft handler, hydrate-from-draft,
  submit updates draft row instead of inserting
- `src/lib/parayanamFilters.ts` — add `DRAFT` to hidden states
- `src/hooks/useParayanamDrafts.ts` — **new**: list owner drafts for a group, discard a draft
- `src/components/ParayanamDraftsList.tsx` — **new**: draft cards with Continue Setup / Discard
- `src/pages/GroupDetailPage.tsx` — render the drafts list for the owner only

## I. SQL migration

Written after confirming the constraint (D). Expected shape:

```sql
-- 1. draft snapshot column
alter table public.challenge_sessions
  add column if not exists draft_state jsonb;

-- 2. allow DRAFT, keeping every existing value
--    (the value list will be copied verbatim from the existing constraint definition
--     found by the query in section D, with 'DRAFT' appended)
alter table public.challenge_sessions
  drop constraint if exists challenge_sessions_technical_state_check;
alter table public.challenge_sessions
  add constraint challenge_sessions_technical_state_check
  check (technical_state in (<existing values...>, 'DRAFT'));

-- 3. drafts are owner-only
create policy "Owner can read own drafts"
  on public.challenge_sessions for select to authenticated
  using (technical_state <> 'DRAFT' or user_id = auth.uid());
```

Step 2 runs only if a CHECK constraint actually exists. Step 3 is adjusted to fit the existing
policies on the table (reviewed before writing), so member-visibility rules for non-draft rows stay
exactly as they are.

## Open question

Should drafts also appear for personal (non-group) parayanams on `/progress`, or only on the Group
page as specified? The plan currently implements group drafts only, and personal drafts can be
saved and resumed via the same mechanism if you want them surfaced too.
