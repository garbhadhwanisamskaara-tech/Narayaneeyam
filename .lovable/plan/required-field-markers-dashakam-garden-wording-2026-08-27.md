# Required-field markers + Dashakam Garden wording

Wording and visual-indicator changes only. No validation, allocation, schedule, relay, participant, invitation, Supabase or schema changes.

## 1. Files to modify

- `src/pages/CreateParayanamPage.tsx` — Screen 1 (details), distribution step, "* Required fields" note.
- `src/components/LiveScheduleEditor.tsx` — live session defaults + per-session fields.
- `src/components/ContributionDetailsForm.tsx` — contribution fields.
- `src/components/DashakamGarden.tsx` — default heading only.
- `src/pages/GroupDetailPage.tsx` — group garden headings/subtitle.

`ParayanamModeSelector.tsx` and `ParticipationTypeSelector.tsx` are radio-card choices that always have a default selected — no asterisk needed.

## 2. Mandatory fields identified (from existing validation)

From `canNext` on the details step (`dashakams.length > 0 && startDate && endDate && endDate >= startDate && dates.length > 0`):

| Field | Screen | Why required |
|---|---|---|
| Dashakams (set / custom selection) | Details | `dashakams.length > 0` |
| Start Date | Details | `!!startDate` |
| End Date | Details | `!!endDate` |
| Parayanam Days (pattern; weekday chips when "Selected days") | Details | `dates.length > 0` fails with no weekday picked |
| Contribution amount | Contribution (PAID only) | `isValidContributionAmount` |
| Payment link | Contribution (PAID only) | `isValidPaymentUrl` |
| Start Time / End Time | Live (LIVE only) | `isLiveScheduleValid` requires both, end > start |
| Joining link (meeting URL) | Live (LIVE only) | `isValidMeetingUrl` on session or default link |

Not marked (optional): Parayanam name, note for members, per-session overrides that fall back to the defaults.

## 3. Exact wording

Asterisk markup, subtle and consistent: `<span className="text-destructive">*</span>` appended to the existing label, with `aria-hidden`.

- "Parayanam name (optional)" — unchanged
- "Choose dashakams *"  (existing section heading, asterisk appended)
- "Start date *"
- "End date *"
- "Parayanam days *"
- "Contribution amount *"
- "Payment link *"
- "A note for members (optional)" — unchanged
- "Start time *", "End time *", "Joining link *" (defaults block and per-session rows; per-session rows keep their current fallback behaviour)
- Small note directly under the "Step X of Y" line: `* Required fields` in muted small text; the contribution and live steps get the same one-line note at the top of their section.

Garden wording:

- `DashakamGarden` default `title`: "Dashakam Garden" -> "My Dashakam Garden" (personal/default context).
- Group garden in `GroupDetailPage`:
  - active garden title: `"Parayanam Dashakam Garden"`, with the parayanam name as supporting `subtitle` text beneath (falls back to the existing bloom count line when there is no name).
  - the two placeholder cards ("You're not part of this parayanam" / "schedule is prepared automatically"): heading "Group Dashakam Garden" -> "Parayanam Dashakam Garden"; body text unchanged.

## Technical notes

The asterisk is presentational only — no `required` attributes added, no changes to `canNext`, `isLiveScheduleValid`, `isValidContributionAmount`, `isValidPaymentUrl`, or any submit path. The garden change touches only `title`/`subtitle` props and static heading strings; blooms, tiles, tap handlers and queries stay as they are.
