/**
 * Shared visibility rules for groups and parayanams.
 *
 * Cancelling a parayanam archives that session only (technical_state), and
 * a group is retired via its own `status` column ("archived"/"dissolved").
 * Nothing is ever deleted — these lists just decide what is shown.
 */

/**
 * challenge_sessions.technical_state values that must never appear in the
 * normal UI. DRAFT parayanams are still being set up — they are shown only to
 * their own Guru, through useParayanamDrafts.
 */
export const HIDDEN_SESSION_STATES = ["ARCHIVED", "CANCELLED", "DRAFT"] as const;

/** groups.status values that must never appear in the UI. */
export const HIDDEN_GROUP_STATUSES = ["archived", "dissolved"] as const;

/** PostgREST `in` filter literal, e.g. "(ARCHIVED,CANCELLED)". */
export const HIDDEN_SESSION_STATES_FILTER = `(${HIDDEN_SESSION_STATES.join(",")})`;
export const HIDDEN_GROUP_STATUSES_FILTER = `(${HIDDEN_GROUP_STATUSES.join(",")})`;

export function isHiddenSessionState(state: string | null | undefined) {
  return !!state && (HIDDEN_SESSION_STATES as readonly string[]).includes(state.toUpperCase());
}

export function isHiddenGroupStatus(status: string | null | undefined) {
  return !!status && (HIDDEN_GROUP_STATUSES as readonly string[]).includes(status.toLowerCase());
}
