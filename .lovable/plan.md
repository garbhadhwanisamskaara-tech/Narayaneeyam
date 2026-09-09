# Restore participant names securely

## Confirmed diagnosis

- Both screenshots show the owner’s participant lists falling back to “Member.”
- Participant rows are loading successfully; only their names are missing.
- The screen performs a second `profiles` query for names. Current browser requests prove the signed-in owner can read her own profile, so the table grant works, but other users’ profile rows are being filtered by the current access policy.
- No relevant frontend or migration change was committed in the last three days. The 6 September edit to `ParayanamParticipantManager.tsx` changed only error wording.
- Accepting a Parayanam invitation updates `parayanam_participants` only. It does not create a `group_members` row; joining through a group invitation is the separate path that does that.

## Implementation

1. Add a narrowly scoped database function that accepts a Parayanam session ID and returns only participant IDs, display names, and email fallbacks.
2. Inside the function, derive the caller from the authenticated session and return rows only when that caller owns the requested Parayanam. Do not trust a caller-supplied owner ID.
3. Grant function execution only to signed-in users and revoke public/anonymous execution.
4. Update `ParayanamParticipantManager.tsx` to use this owner-only lookup instead of directly reading other users’ `profiles` rows.
5. Keep the existing “Member” fallback only for genuinely empty names. Show a visible loading error if the secure lookup itself fails, rather than silently turning every person into “Member.”
6. Leave invitation acceptance and `group_members` unchanged: accepting a Parayanam invitation must not silently make someone a group member.

## Database ownership

Because you manage the database separately, the SQL will be added as a reviewable migration file but will not be run against your database from this task. The frontend change will require you to apply that SQL before publishing it.

## Verification

- As the Parayanam owner, confirm invited and confirmed participants show their names/email fallback.
- As a non-owner participant, call the lookup for the same session and confirm it returns no private participant details.
- Confirm an unrelated signed-in user cannot retrieve names.
- Confirm the existing invitation response still changes only `parayanam_participants` and does not insert into `group_members`.
- Confirm database-function application separately from the frontend display check; until you apply the SQL, the live database path remains unverified.
