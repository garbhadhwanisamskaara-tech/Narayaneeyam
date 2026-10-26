# Participation labels and field counters

- [x] Centralize participation display labels without changing stored values, queries, or access logic.
- [x] Add and verify live counters below create/resumed-draft name and remarks fields and the existing Manage name field.
- [ ] Existing-parayanam remarks counter: blocked because Manage has no remarks editor; adding one requires reading/saving remarks, outside the no-query/logic-change scope.

# Trial date and member wording

- [x] Update only the fixed trial end date to 2099-12-31T23:59:59+05:30.
- [x] Audit requested date references and verify the date rule; keep SubscribePage, admin, and access/grace logic unchanged.

# Approval-only help and navigation follow-up

- [x] Remove Payment History access while retaining unused files, and remove the subscription support category on all platforms.
- [x] Update FAQ, guide, and privacy wording; preserve protected subscription/admin/server files.
- [x] Verify category behavior and audit remaining member-visible payment references.

# Member parayanam approval-only flow

- [x] Remove member checkout and replace payment displays with approval states on web and TWA.
- [x] Remove Manage's legacy link/note inputs; preserve owner tools, subscriptions, and server/database objects.
- [x] Test joining rules and audit every remaining requested payment reference.

# Progress dashboard redesign

- [x] Reuse the existing lotus and visual tokens.
- [x] Redesign Progress summary, recent completions, and parayanam garden access.
- [x] Add the owner-only searchable, filterable, sortable member progress table.
- [x] Add scheduled-date expected progress without changing existing report totals.
- [x] Remove the Home “Verses Chanted” tile while preserving live sessions.
- [x] Validate types, tests, source-level guardrails, and available browser views.
- [x] Refine Progress tooltips and visuals; remove its duplicate and daily-parayanam cards.

# Guided Journey timing and Home prompt

- [x] Return day 0 before a journey cycle starts.
- [x] Distinguish not-started, active, grace, and closed journey states.
- [x] Keep grace-period days completable and offer another eligible run after closure.
- [x] Replace the inline Journey Home card with a floating, dismissible prompt.
- [x] Verify types, tests, and available browser states.

# More menu help consolidation

- [x] Merge Help & Support and Settings & Guide into one Help & Settings entry.
- [x] Keep Guided Journeys clearly present and both destination pages reachable.
- [x] Verify types and navigation.

# Journey card actions and affordance

- [x] Add optional two-step actions to journey day cards without changing single-step days.
- [x] Add a clear View journey affordance to every journey list card.
- [x] Verify types, tests, and both card states.
# Custom Playlist action bar on phones

- [x] Raise the playlist panel above the bottom navigation and add gesture-bar safe-area padding to its action bar.
- [x] Keep the header and Shuffle / Save / Play bar fixed while only the dashakam grid and selected list scroll.
- [x] Verify on a phone-sized Listen and Chant screen that Save and Play are visible without scrolling.

# Festival card dismiss fix

- [x] Make the decorative glow ignore pointer events and raise the dismiss button above it.
- [x] Verify dismiss, pill collapse, reopen, and same-day persistence on phone and desktop sizes.

# Today's Dashakam card controls

- [x] Add a top-right × that hides the card for the rest of the Kolkata day, stored locally.
- [x] Add an outline Listen button beside Chant Now that opens the same dashakam, and a "+N more" line that opens the queue list.
- [x] Verify on phone and desktop sizes that the card, its buttons, and the queue panel behave, with no page errors.

# Garden loading state

- [x] While the garden is loading, show only its title and the tending message with a small spinner — no grid and no compact preview.
- [x] Verify in the live preview that no lotus cells appear until the real occurrences arrive, and that the grid then renders them.

# Paid parayanam eligibility for exempt owners

- [x] Accept contribution_status "not_required" alongside "confirmed" for PAID parayanams, keeping the confirmed-status and active-access checks.
- [x] Cover the rule with tests for exempt owners, approved members, pending contributions, and locked access.

# Garden bloom mode

- [x] Read bloom_mode from challenge_sessions in both garden hooks and return bloomMode; in SESSION mode every tile is untappable with the automatic-bloom reason.
- [x] Show the matching helper wording in DashakamGarden and pass bloomMode from MyGardenDialog and GroupDetailPage.
- [x] Cover the tile lock and both wordings with tests; verify types and the preview build.


