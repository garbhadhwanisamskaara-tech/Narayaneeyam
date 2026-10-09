# Architecture rules

- Member parayanam flows call the existing invite-response RPC or self-join function and rely on server-owned approval/access state; no client checkout is used, keeping member actions separate from owner reconciliation and subscriptions.
- New support-ticket choices use a separate filtered category list while historical category resolution stays intact, preventing unavailable choices without breaking old tickets.