# Architecture rules

- Parayanam participation display text comes from participationLabel; keep stored enum values and access/payment logic separate from presentation.
- Existing parayanam name and remarks inputs share CharacterCounter with semantic warning/limit tokens, so create, resumed drafts, and edit fields use the same feedback.

- Member parayanam flows call the existing invite-response RPC or self-join function and rely on server-owned approval/access state; no client checkout is used, keeping member actions separate from owner reconciliation and subscriptions.
- New support-ticket choices use a separate filtered category list while historical category resolution stays intact, preventing unavailable choices without breaking old tickets.
- Home-screen "hide for today" controls store the Asia/Kolkata calendar date in localStorage and never change the server-side assignment, so the dashakam returns by itself the next day and still appears in the queue list.
- Card links into the Listen page carry ?dashakam=N and the Listen page honours that over the restored last-played position, so a card always opens the dashakam it names.
- DashakamGarden renders only its title and the loading message while data is loading; the lotus grid and compact preview appear after loading finishes, so placeholder buds never flash before the real occurrences arrive.
- Both garden hooks read bloom_mode from challenge_sessions and return bloomMode; the mode only selects DashakamGarden's helper wording, while tapping a lotus stays available in every mode.
- Home garden previews consume only useMyDashakamGarden read state and keep exclusive expansion locally; interactive updates remain in the existing MyGardenDialog to preserve garden behaviour.
- The home garden roller card renders in its own section directly after the hero, never inside it, so opening a garden grows the page below the hero and never changes the hero's height.
- Parayanam creation stores bloom_mode and show_garden_on_home on the session row; the bloom-mode choice is offered only for live parayanams and the home-garden opt-in only for group parayanams, both independent of monetization approval.

