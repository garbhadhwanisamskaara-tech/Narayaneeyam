# Architecture rules

- Member parayanam flows call the existing invite-response RPC or self-join function and rely on server-owned approval/access state; no client checkout is used, keeping member actions separate from owner reconciliation and subscriptions.
- New support-ticket choices use a separate filtered category list while historical category resolution stays intact, preventing unavailable choices without breaking old tickets.
- Home-screen "hide for today" controls store the Asia/Kolkata calendar date in localStorage and never change the server-side assignment, so the dashakam returns by itself the next day and still appears in the queue list.
- Card links into the Listen page carry ?dashakam=N and the Listen page honours that over the restored last-played position, so a card always opens the dashakam it names.
