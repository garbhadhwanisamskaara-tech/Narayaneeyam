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
  ADD COLUMN IF NOT EXISTS distribution_mode text,      -- SAME_FOR_ALL | RELAY | REPEAT_SAME
  ADD COLUMN IF NOT EXISTS schedule_pattern text,       -- DAILY | WEEKDAYS
  ADD COLUMN IF NOT EXISTS schedule_weekdays smallint[];-- 0=Sun .. 6=Sat, used when WEEKDAYS
-- CHECK constraints allowing NULL, so legacy rows stay valid.
-- Backfill distribution_mode from challenge_type as described above.
```

No new table: actual Parayanam dates stay derived (start/end + pattern) and are materialised where they already are — in `parayanam_schedule` and `live_sessions`. `challenge_type` keeps its current values so nothing existing breaks.

## 6. Backward compatibility

- Every new column is nullable with a legacy-safe reading: `distribution_mode IS NULL` -> derive from `challenge_type`; `schedule_pattern IS NULL` -> DAILY.
- Already-finalised parayanams keep their `parayanam_schedule` rows untouched; nothing is regenerated.
- Old single-day relays remain valid (start = end, one Parayanam day).

## 7. Algorithm changes

New shared helper `src/lib/parayanamDays.ts`:
- `parayanamDates(start, end, pattern, weekdays): string[]` — the actual Parayanam days, the single source of truth for previews, schedule generation and live sessions.
- `daysBetween()` is demoted: it stays for calendar span display, but no allocation may use it. All three algorithms take `dates.length`, not calendar duration.

`buildSchedule(dashakams, dates, mode, memberIds)` (signature change from start/end to a date array):
- `SAME_FOR_ALL`: split the set into `dates.length` contiguous chunks, one chunk per Parayanam day, `assigned_user_id = null`.
- `RELAY`: for each Parayanam day, split the whole set into `memberIds.length` balanced contiguous blocks (first `remainder` members get one extra) and rotate block ownership by the day index — day *d* gives member *i* the block `(i - d) mod n`, matching your example.
- `REPEAT_SAME`: the full set on every Parayanam day, `assigned_user_id = null`. The `dashakam_list` is stored once (no more duplication) and expansion happens at schedule-generation time.

`finalize_parayanam()` (server RPC — its SQL is not in this repo, so it must be re-read from the database before editing) must mirror the same three branches and iterate the derived date list rather than assuming one day or every calendar day. It stays the authority for group allocation, since it runs after invites are answered.

## 8. Live sessions

`LiveScheduleEditor.generateSessions()` currently derives dates itself (`every_day` / `selected_days` / `individually`). That duplicates the new Parayanam-day logic. Change:
- Drop the editor's own every-day/weekday choice; feed it the derived Parayanam dates from Screen 1.
- The editor keeps times, meeting link, join window, per-session edits (single/future/all) and "add individually" for extra one-off sessions.
- One live session per actual Parayanam date, never for the gap dates.
- Insertion into `live_sessions` is unchanged.

## 9. Files to modify

- `src/lib/parayanamDays.ts` (new) — date derivation + labels.
- `src/hooks/useParayanamSchedule.ts` — `buildSchedule` rewrite (date list + 3 modes + rotation), `generate()` callers.
- `src/pages/CreateParayanamPage.tsx` — dates + "When will this take place?" on Screen 1, weekday chips, "N Parayanam days" summary, distribution screen preview with real dates, remove relay collapse and REPEAT expansion, persist the new columns.
- `src/components/LiveScheduleEditor.tsx` — consume derived dates.
- `src/components/ParayanamReview.tsx` — show pattern and Parayanam-day count.
- `src/pages/GroupSchedulePage.tsx` — read-only summary + preview; keep editing only where the parayanam predates the wizard.
- `src/pages/GroupDetailPage.tsx` — empty-state wording, remove duplicate card.
- `src/hooks/useParayanamParticipants.ts` + `src/components/ParayanamInviteCard.tsx` — first live session date/time.
- `src/hooks/useChallengeSessions.ts`, `ManageParayanamDialog.tsx` — read `distribution_mode` with legacy fallback.

## 10. RLS / policy implications

- New columns inherit `challenge_sessions` policies; nothing to add.
- The invite card needs the first session's date/time for a not-yet-confirmed member. If `live_sessions` policies only admit confirmed participants, this needs either the existing public/date-only view or a small RPC returning date/time only — never `meeting_url`. To be confirmed against the live policies before implementation.
- `get_live_session_access()` remains the only path to the meeting URL.

## 11. Edge cases handled

- No selected weekday inside the range -> block "Next" with "This range has no <weekday> in it."
- One weekday / several weekdays / start or end date not on a selected weekday -> pure filter over the range; boundaries are included only if they match.
- Relay with more members than dashakams -> extra members get an empty block that day; rotation still moves the non-empty blocks, so nobody is permanently idle across days.
- Uneven division -> first `remainder` members get one extra dashakam, same as the server rule.
- Accept/decline after preview -> the preview is explicitly labelled provisional and based on currently invited members; `finalize_parayanam()` recomputes from confirmed participants on the start date.
- Participant count changing before finalisation -> same as above; nothing is written until finalisation.
- Legacy parayanams without the new fields -> DAILY + derived distribution.
- Live sessions must equal the Parayanam dates -> both come from the same helper; a mismatch check runs when the date range or pattern changes and regenerates sessions.

## Open item before coding

`finalize_parayanam()` and the `live_sessions` RLS policies live only in the database. I will read both from the live schema first and adapt them, rather than assuming their current text.
