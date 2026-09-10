# Fix: wrong "Awaiting Guru Approval" copy for PAID unpaid parayanams

## Problem
`AwaitingContributionCard` in `src/components/ParayanamInviteCard.tsx` is shown after a member accepts a PAID parayanam but has not yet completed payment. It currently displays the title and copy "Awaiting Guru Approval" in both its web and non-web branches. That is incorrect: at this stage the member only needs to pay; Guru approval happens later, after payment.

## Goal
- For PAID parayanams with a pending contribution, replace the "Awaiting Guru Approval" sub-block with copy that points the member to complete payment.
- Keep the existing "Awaiting Guru Approval" copy for the FREE/manual-approval case (defensive branch, since the current hook only surfaces PAID rows).
- Preserve payment URL, contribution amount, disclaimer, notes, and all existing styling.

## Files to change
1. `src/components/ParayanamInviteCard.tsx`
   - In `AwaitingContributionCard`, branch on `invite.participation_type`.
   - PAID + `contribution_status === "pending"`: show a neutral payment prompt such as "Complete your contribution below to join." instead of the Clock + "Awaiting Guru Approval" title.
   - Non-PAID/FREE: retain the current "Awaiting Guru Approval" title and body.
   - Keep the early `return null` when `contributionSettled`.

## Verification
- Run `bun run build` (or equivalent) to confirm no TypeScript errors.
- No database or Supabase changes required.
