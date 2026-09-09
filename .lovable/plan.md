# Participant names showing as "Member" — findings and next steps

## What the change history shows

Last 3 days of commits (6, 7, 8, 9 September):

- `ParayanamParticipantManager.tsx` — one commit, 6 September (`4544a38`). The only change was swapping a raw error string for a friendlier error message. The name-loading code was untouched.
- No commit in that window touched anything else name-related.
- No database migration was pushed in the last 3 days. The only migration files in the project are dated 5 April, 11 May and 26 August, and the newest of those was last committed on 26 August. Nothing here changed the profiles access rules, the `shares_group_with()` function, or `group_members`.

So the app-side code is not the cause. The behaviour changed without any code or migration change from this side, which points at a change made directly in the database.

## Answer to the group_members question

Confirmed, from the code: accepting or confirming a parayanam invitation does **not** add anyone to `group_members`.

- Accepting an invitation calls only `respond_to_parayanam_invite`, which updates the row in `parayanam_participants`.
- The only place a person becomes a group member is joining the group itself, via `accept_group_invite` on the join-link page (plus the owner being inserted when the group is created).

So a person can be a parayanam participant while not being a `group_members` row — exactly the situation you suspected. If the profiles read rule requires both people to share a row in `group_members`, those participants' names will not load and the screen falls back to the literal word "Member".

Important nuance: the names are missing for **all** participants, including ones who almost certainly are in `group_members`. That suggests the profiles read rule is now failing for everyone, not only for participants outside the group — for example the policy or the `shares_group_with()` helper was replaced/dropped, or the read permission on `profiles` was revoked. The missing `group_members` rows are a real second problem, but on their own they wouldn't explain "all names blank".

## How the screen loads names (for reference)

The manager reads participants from `parayanam_participants`, then does a second read of `profiles` for those people's display name and email. When that second read returns nothing — whether blocked by policy or by permissions — every row silently falls back to "Member". There is no error shown, which is why this looks like a display bug rather than an access failure.

The latest browser requests reinforce this: the signed-in owner can successfully read her own profile row, so the `profiles` table is reachable and has a valid grant. The failure is therefore much more likely to be row filtering by the current `profiles` SELECT policy than a missing table-wide grant. The screenshots show that filtering affecting the other invited and confirmed people at scale.

## What change impacted it

No matching app or migration change was made in this repository during the last three days. The 6 September participant-manager edit changed only error wording; it did not change the profiles query. No recent repository commit changed `profiles` policies, `shares_group_with()`, or `group_members`.

Therefore, the exact database-side change cannot be named from this repository. The observed behaviour is consistent with a policy/function change made directly in the database: the owner may read her own profile, but other participant profile rows are filtered out. Comparing the live `profiles` SELECT policy and `shares_group_with()` definition with the database's earlier version will identify that exact direct change.

## Suggested next steps (no changes made)

1. On your side, check the current read policies on `profiles` and the definition of `shares_group_with()`, and compare against what existed before 6 September.
2. Confirm the read privilege on `profiles` is still granted to signed-in users.
3. Decide the intended rule: should a parayanam owner be able to see the names of participants who are not group members? If yes, the profiles policy needs a parayanam-based path in addition to the group-based one.

Once you tell me what you find, I can plan the matching app-side work — including surfacing a visible message instead of a silent "Member" fallback when names can't be loaded.
