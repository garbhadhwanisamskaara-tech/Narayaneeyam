# Bell notification dismissal and closed-ticket filtering

## Changes
- Exclude support tickets with status `closed` when deriving unread reply alerts.
- Add a device-local notification dismissal helper backed by `localStorage`.
- Update bell rows for invitations, awaiting contributions, and support replies with an inline dismiss control.
- Filter dismissed rows before calculating sections, empty state, and badge count.
- Scope support-reply dismissal to the ticket and reply timestamp so later replies reappear.
- Leave Today’s and Pending Dashakams unchanged and without dismissal controls.

## Validation
- Run the focused TypeScript checks and tests available for the changed files.
- Confirm source-level behavior for filtering, badge totals, timestamp keys, and unchanged dashakam queue rendering.

## Technical details
- Frontend only; no database, policy, schema, or write-path changes.
- Bell dismissal never mutates invitation, contribution, ticket, or group data.
