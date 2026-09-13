# Progress dashboard display redesign

## Goal
Redesign only the Progress and Home presentation while preserving every existing completion, payment, chanting, group, schedule, authentication, and database-write path.

## Progress page
- Remove the live-session panel from Progress only; keep the Home live-session panel unchanged.
- Rebuild the Progress heading with the existing app logo above “Namaste {displayName}”.
- Present five compact read-only summary tiles using existing colors, fonts, icons, values, and motion patterns:
  - Lifetime Dashakams: existing unique completion count and percentage ring.
  - This Year: existing yearly completion count.
  - Where You Are Right Now: existing saved Dashakam/Verse position, with the existing Continue Chanting action inside this tile.
  - Most Returned To: calculate the most frequent Dashakam from the already-loaded current-year `user_progress` rows.
  - Feathers Collected: `useFeathers().feathers.length`, using the existing app logo as the icon.
- Replace always-visible explanatory captions with accessible information tooltips that work by hover and keyboard focus.
- Keep the existing journey progress bar and other read-only progress information, while removing the separate Continue Chanting panel now folded into the position tile.
- Show only the three most recent completions and replace their pill treatment with the shared Lotus at 100% bloom.
- Replace the current single My Parayanams link card with group/parayanam rows sourced from the existing read-only parayanam report. Clicking a parayanam row opens the existing garden dialog directly.
- Mark owned groups with “You are the Owner” and show “View each member’s progress →” beside that ownership label.

## Shared lotus and garden dialog
- Extract the existing five-petal `Lotus` SVG unchanged into a reusable component, then import it from `DashakamGarden`, Progress recent completions, and the member-progress presentation.
- Extend `MyGardenDialog` with optional initial parayanam/report context so Notification Bell behavior remains unchanged while Progress can open a selected garden directly.
- Keep the existing personal garden as the default view.
- For owned groups only, add a “Your garden / Group garden” segmented toggle.
- Render Group garden as read-only, anonymous aggregate bloom intensity per scheduled occurrence, derived from completion totals already loaded by the existing report/garden machinery. Do not add completion actions or collect new data.
- Keep completed-garden browsing and all current notification-bell behavior unchanged.

## Owner-only member progress table
- Add an owner-only dialog/table opened from the group row link.
- Include search by member name, status filters (All, Behind, On Track, Complete), and sortable column headers with ascending/descending toggles.
- Show Member, Completed, Expected, Total, Progress, and Status. Progress uses a compact existing-token bar.
- Calculate status exactly as requested:
  - Complete when `completed >= total`
  - On Track when not complete and `completed >= expected`
  - Behind otherwise
- Preserve the existing owner-only population rule from `useParayanamReport`; non-owners never receive table rows.

## Read-only report extension
- Add `scheduled_date` to the existing `parayanam_schedule` select and carry it through the existing schedule map.
- Add `expected` to `ReportStats`, with `0` in empty stats.
- Inside member `statsFor()`, calculate expected rows using the requested ISO-date comparison.
- Leave existing `completed`, `notCompleted`, completion lists, and bloom calculations unchanged.
- Expose only the already-derived per-occurrence aggregate needed for the owner Group garden; no new query, policy, schema, or write.

## Home page
- Remove the sole “Verses Chanted” tile and its now-empty grid wrapper.
- Leave all other Home sections, including `UpcomingLiveSessionCard`, unchanged.

## Validation
- Run the focused TypeScript/test checks provided by the project harness.
- Verify Progress in desktop and mobile-sized browser views: tooltips, tile wrapping, Continue action, garden opening/toggle, owner-only table search/filter/sort, and no overlaps.
- Verify Home no longer shows “Verses Chanted” and still shows upcoming live sessions.
- Confirm no database writes, migrations, policies, completion actions, payment flows, or unrelated logic changed.
