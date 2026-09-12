# Why "Yes, decline" does nothing — and how to fix it

## What happens today

When you tap the red "Yes, decline" on an awaiting-contribution invite, the app asks the
database to withdraw your pending contribution. If that request is refused or fails, the app
currently **throws the error away silently**: no message, no toast, the card just stays.

So what you see (nothing happens) is exactly what a failed request looks like right now.
The failure itself is unconfirmed — the decline action calls a database routine
(`withdraw_pending_contribution`) that is not defined anywhere in this project's files,
since database changes are managed separately. It may be missing, renamed, or refusing the
request.

## Step 1 — Make the failure visible (first, small change)

In the notification bell's decline handler, stop discarding the error. Show the actual
reason in an error toast and inside the confirmation box, and keep the card retryable.
Do the same for the "Awaiting your contribution" section on the group/dashboard page.

This alone tells us in one click whether the routine is missing, blocked by permissions, or
returning no rows.

## Step 2 — Fix the cause based on that message

- If the message says the function does not exist or permission is denied, the database
  routine needs to be added or granted on your side (database work is outside this project's
  files, so I will tell you exactly what is needed).
- If it returns successfully but the row is unchanged, the decline needs to target the
  correct status fields instead, and I will adjust the app call accordingly.

## Technical notes

- `src/hooks/useParayanamParticipants.ts` → `useMyAwaitingContributions().decline` already
  throws a useful error; it is the callers that swallow it.
- `src/components/NotificationBell.tsx` → `declineContribution` has an empty `catch {}`.
  Add error state per item + `toast.error(...)`.
- `src/components/PendingInvitesSection.tsx` → same treatment for the awaiting list.
- No changes to payment flow, contribution amounts, or `contribution_status` logic.
