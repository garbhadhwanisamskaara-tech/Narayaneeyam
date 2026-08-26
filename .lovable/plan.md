# Multi-day Relay, schedule patterns and actual Parayanam days

## 1. What of the earlier proposal stays valid

- Start Date + End Date move to Screen 1 (Create a Parayanam). Valid.
- Schedule/allocation preview shown on the distribution screen. Valid, but must now be date-aware.
- GroupSchedulePage becomes read-only for dates/pattern/distribution + preview. Valid.
- Invite card shows first live session date/time via a safe source (no `meeting_url` exposure). Valid.
- "Save & invite" success/error feedback. Valid.
- Remove the duplicate "No parayanam yet" card and use the explicit member wording. Valid.

## 2. What is now invalid

- "Relay is single-day, collapse `end_date` to `start_date`" — dropped everywhere:
  - `CreateParayanamPage`: `isRelay`/`effectiveEndDate` collapse, and the "Relay runs on a single day" copy.
  - `useParayanamSchedule.buildSchedule`: the split branch that writes every row with `scheduled_date = startDate`.
  - `GroupSchedulePage` relay copy and preview.
  - Relay-specific wording in review, mode selector and group pages.
- "Infer REPEAT from the expanded dashakam list length" — dropped. REPEAT is currently faked by repeating the dashakam list once per day inside `submitDashakams`; that is lossy and must go.

## 3. How the three modes are stored today

- `challenge_sessions.challenge_type`: `personal`, `group_standard` (Option 1 **and** Option 3 today), `group_relay` (Option 2).
- No column distinguishes SAME_FOR_ALL from REPEAT_SAME; REPEAT only survives as duplicated numbers in `dashakam_list` and an inflated `dashakams_target`.
- No column records the schedule pattern (every day vs weekdays). Actual days are implied by `start_date..end_date`.
- Per-day allocation lives in `parayanam_schedule` (`dashakam_no`, `scheduled_date`, `assigned_user_id`), generated client-side for personal parayanams and by the server RPC `finalize_parayanam()` for group ones.

## 4. Do we need an explicit `distribution_mode`?

Yes. It is the safest option:

- `challenge_type` is overloaded (it also encodes personal vs group) and is read by `countIncompleteAssignments`, `ManageParayanamDialog`, `GroupSchedulePage` and the server RPC. Adding new values to it would break those readers.
- A new nullable column is additive: old rows read `NULL` and fall back to today's meaning.
- Backfill by rule, not by heuristic: `group_relay -> RELAY`, `group_standard -> SAME_FOR_ALL`, `personal -> SAME_FOR_ALL`. Existing REPEAT parayanams created via the current fake-expansion continue to behave exactly as they do now (they stay SAME_FOR_ALL over an expanded list) — no data is rewritten.

## 5. Minimum database changes

```sql
ALTER TABLE public.challenge_sessions
## 5. Minimum database changes

One additive migration, no destructive statements, no `challenge_type` value changes:

```sql
ALTER TABLE public.challenge_sessions
  ADD COLUMN IF NOT EXISTS distribution_mode  text,        -- SAME_FOR_ALL | RELAY | REPEAT_SAME
  ADD COLUMN IF NOT EXISTS schedule_pattern   text,        -- DAILY | WEEKDAYS
  ADD COLUMN IF NOT EXISTS schedule_weekdays  smallint[];  -- 0=Sun .. 6=Sat, only when WEEKDAYS

ALTER TABLE public.challenge_sessions
  ADD CONSTRAINT challenge_sessions_distribution_mode_check
  CHECK (distribution_mode IS NULL
         OR distribution_mode IN ('SAME_FOR_ALL','RELAY','REPEAT_SAME'));

ALTER TABLE public.challenge_sessions
  ADD CONSTRAINT challenge_sessions_schedule_pattern_check
  CHECK (schedule_pattern IS NULL OR schedule_pattern IN ('DAILY','WEEKDAYS'));

-- Weekdays must be present and valid only for WEEKDAYS
ALTER TABLE public.challenge_sessions
  ADD CONSTRAINT challenge_sessions_schedule_weekdays_check
  CHECK (
    schedule_pattern IS DISTINCT FROM 'WEEKDAYS'
    OR (schedule_weekdays IS NOT NULL
        AND array_length(schedule_weekdays,1) BETWEEN 1 AND 7
        AND schedule_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
  );

-- Rule-based backfill (no heuristics, no data rewrite elsewhere)
UPDATE public.challenge_sessions
   SET distribution_mode = CASE WHEN challenge_type = 'group_relay'
                                THEN 'RELAY' ELSE 'SAME_FOR_ALL' END,
       schedule_pattern  = COALESCE(schedule_pattern, 'DAILY')
 WHERE distribution_mode IS NULL;
```

No new table. Actual Parayanam dates stay derived and are materialised only where they already are: `parayanam_schedule.scheduled_date` and `live_sessions.session_date`. `parayanam_member_progress`, `parayanam_participants` and `groups` are untouched.

Deliberately **not** doing: a `parayanam_days` table (redundant with `parayanam_schedule`), a new `challenge_type` value (would break every existing reader), or removing the REPEAT list-expansion data already written.

## 6. Backward compatibility

- All three columns are nullable; the backfill gives every existing row an explicit value, and the app still tolerates `NULL` (`distribution_mode ?? (challenge_type === 'group_relay' ? 'RELAY' : 'SAME_FOR_ALL')`, `schedule_pattern ?? 'DAILY'`).
- Finalised parayanams: no `parayanam_schedule` rows are recomputed. Completion history in `parayanam_member_progress` keys off `schedule_id`, so it is unaffected.
- Existing REPEAT parayanams (created with the duplicated `dashakam_list`) keep working as SAME_FOR_ALL over their expanded list — same allocation as today. Only newly created REPEAT_SAME parayanams store the list once.
- Old single-day relays: start = end, one Parayanam day, identical output from the new algorithm.
- `dashakams_target` semantics change only for new REPEAT_SAME rows (set = list length, not list length x days); progress percentages must therefore compute against generated schedule rows, which is already the case in `useParayanamReport`/`useSessionGarden` — to be re-verified during implementation.

## 7. `finalize_parayanam()`, `buildSchedule()`, `daysBetween()`

Shared source of truth, new file `src/lib/parayanamDays.ts`:

```ts
parayanamDates(start, end, pattern, weekdays): string[]   // actual Parayanam days
parayanamDayCount(...)                                    // = dates.length
formatDayLine(i, date)                                    // "Day 1 · Thu 3 Sep"
```

`buildSchedule()` — signature changes from `(dashakams, startDate, endDate, mode, memberIds)` to `(dashakams, dates: string[], mode: DistributionMode, memberIds: string[])`, with `DistributionMode = "SAME_FOR_ALL" | "RELAY" | "REPEAT_SAME"`:

- **SAME_FOR_ALL** — chunk the set into `dates.length` contiguous blocks (`ceil` sizing as today), one block per Parayanam day, `assigned_user_id = null`.
- **RELAY** — for each day index `d`: split the whole set into `n = memberIds.length` balanced contiguous blocks (first `remainder` blocks get one extra), then assign block `b` to member `(b + d) mod n`. This reproduces your Day 1 / Day 2 / Day 3 example exactly. Every day emits the full set.
- **REPEAT_SAME** — the full set on every Parayanam day, `assigned_user_id = null`.

`daysBetween()` — kept only for calendar-span display; every allocation path switches to `dates.length`. Callers audited: `CreateParayanamPage` (REPEAT expansion — deleted), `GroupSchedulePage`, previews.

`finalize_parayanam()` (Postgres RPC; its body is not in this repo, so I will read it from the live database first) must be rewritten to:
1. read `start_date`, `end_date`, `schedule_pattern`, `schedule_weekdays`, `distribution_mode` (with the same `NULL` fallbacks);
2. generate the actual date list in SQL (`generate_series` filtered by `EXTRACT(DOW)` when WEEKDAYS);
3. branch on `distribution_mode` with the three algorithms above, using confirmed participants ordered deterministically (by `invited_at, user_id`) so the rotation is stable;
4. keep its existing delete-then-insert of `parayanam_schedule` and its `finalized_at` write, so re-running stays idempotent.

## 8. Live session generation

Today `LiveScheduleEditor.generateSessions()` owns its own `every_day` / `selected_days` / `individually` date logic, and `CreateParayanamPage` batch-inserts the result into `live_sessions`. That is now a second, competing definition of "which days".

Change:
- The editor no longer asks for a day pattern. It receives `dates: string[]` (the actual Parayanam days) and generates exactly one session per date.
- It keeps: default start/end time, meeting link, join-before window, per-session editing with Single / Future / All scope, and "add individually" for genuinely extra sessions.
- Changing the range, the pattern or the weekday chips on Screen 1 regenerates the session list (existing per-session overrides are preserved by `session_date` key).
- Gap dates never produce a `live_sessions` row.
- `useUpcomingLiveSessions` and `get_live_session_access()` are unchanged.

## 9. Files and functions to modify

| File | Change |
| --- | --- |
| `src/lib/parayanamDays.ts` (new) | `parayanamDates`, day-count, "Day N · Thu 3 Sep" label |
| `src/hooks/useParayanamSchedule.ts` | `buildSchedule` rewrite (date list, 3 modes, relay rotation), `generate()` signature, `DistributionMode` type; `daysBetween` display-only |
| `src/pages/CreateParayanamPage.tsx` | Screen 1: start/end + "When will this Parayanam take place?" (Every day / Selected days of the week + Mon–Sun chips) + "N Parayanam days" summary with the first dates; Screen 2: dated allocation preview for all three modes; remove `isRelay` end-date collapse and the `submitDashakams` REPEAT expansion; persist `distribution_mode`, `schedule_pattern`, `schedule_weekdays`; success/error toast on Save & invite |
| `src/components/ParayanamModeSelector.tsx` / distribution cards | Copy for the three modes; relay no longer "single day" |
| `src/components/LiveScheduleEditor.tsx` | Consume derived dates; drop internal day-pattern UI |
| `src/components/ParayanamReview.tsx` | Rows for schedule pattern, Parayanam-day count, distribution |
| `src/pages/GroupSchedulePage.tsx` | Read-only summary (dates / pattern / distribution / day count) + preview; keep editable fields only for legacy parayanams missing the new columns |
| `src/pages/GroupDetailPage.tsx` | Remove duplicate "No parayanam yet" card; explicit member wording |
| `src/hooks/useParayanamParticipants.ts`, `src/components/ParayanamInviteCard.tsx` | First live session date/time from `live_sessions_public` |
| `src/hooks/useChallengeSessions.ts`, `src/components/ManageParayanamDialog.tsx`, `src/hooks/useParayanamParticipants.ts` (`countIncompleteAssignments`) | Read `distribution_mode` with the legacy `challenge_type` fallback |
| `supabase/migrations/<date>_parayanam_distribution_schedule.sql` (new) | Section 5 SQL |
| `finalize_parayanam()` (database) | Section 7 rewrite |

## 10. RLS / policy implications

- The three new columns live on `challenge_sessions` and inherit its existing policies; no policy edit needed, and no new grant (the table is already exposed).
- Invite card: `live_sessions_public` already exists as a `meeting_url`-free view and is used by `useUpcomingLiveSessions`. I will verify its policy admits an **invited-but-not-yet-confirmed** participant; if it only admits confirmed members, I will add a narrow read path (view policy extension or a date/time-only RPC) rather than widening `live_sessions`.
- `meeting_url` continues to be reachable only through `get_live_session_access()`.
- `finalize_parayanam()` stays `SECURITY DEFINER` with its current owner check; the rewrite must preserve that guard.

## 11. Edge cases

| Case | Handling |
| --- | --- |
| Range contains no selected weekday | Day count 0; "Next" blocked with "There are no Thursdays in this date range." |
| One selected weekday | Plain filter; works for a single date too |
| Multiple selected weekdays | Dates in chronological order regardless of chip order |
| Start date is / isn't a selected weekday | Included only if it matches; the first Parayanam day may be after `start_date` |
| End date is / isn't a selected weekday | Same; the last Parayanam day may be before `end_date` |
| More members than dashakams (Relay) | Some blocks are empty that day; rotation still shifts them, so idleness moves round instead of sticking to one member |
| Uneven division (Relay) | First `remainder` blocks get one extra dashakam — same rule client and server |
| Member accepts / declines after preview | Preview is labelled provisional ("based on currently invited members"); `finalize_parayanam()` recomputes from confirmed participants |
| Participant count changes before finalisation | Nothing is written until finalisation, so the final allocation is always correct |
| Zero confirmed participants at finalisation | Relay falls back to unassigned rows (`assigned_user_id = null`) rather than erroring |
| Legacy parayanam without new fields | DAILY + distribution derived from `challenge_type` |
| Live session dates | Same helper as the schedule; regenerated whenever range or pattern changes, so they can never drift |
| Timezone | All date maths stays on `YYYY-MM-DD` strings with `T00:00:00` local parsing, matching current code, so no off-by-one day |

## Open item

`finalize_parayanam()`'s body and the `live_sessions_public` policies exist only in the database. I will read both from the live schema as the first implementation step and adapt them, rather than assuming their current text.
