import { supabase } from "@/integrations/supabase/client";

/**
 * One consistent concept of "may this member take part in this parayanam".
 *
 * FREE: status = 'confirmed' is enough.
 * PAID: status = 'confirmed' AND contribution_status = 'confirmed'
 *       AND access_status = 'active'. Accepting the invite alone never
 *       grants access — the Guru must approve the contribution
 *       (manually or through bulk confirmation).
 */
export interface EligibilityRow {
  status?: string | null;
  contribution_status?: string | null;
  access_status?: string | null;
}

export function isParticipantEligible(
  row: EligibilityRow | null | undefined,
  participationType?: string | null,
): boolean {
  if (!row || row.status !== "confirmed") return false;
  if (participationType === "PAID") {
    return row.contribution_status === "confirmed" && row.access_status === "active";
  }
  if (participationType === "FREE") return true;
  // Type unknown at the call site: fall back to the row's own gates, which the
  // server keeps in sync (a PAID member awaiting approval is pending/locked).
  return row.contribution_status !== "pending" && row.access_status !== "locked";
}

/**
 * Session ids (out of the given list) the user may actually take part in.
 * Resolves each session's participation_type so PAID is judged strictly.
 */
export async function fetchEligibleSessionIds(
  userId: string,
  sessionIds: string[],
): Promise<Set<string>> {
  const eligible = new Set<string>();
  if (!userId || !sessionIds.length) return eligible;

  const [partRes, sessRes] = await Promise.all([
    (supabase as any)
      .from("parayanam_participants")
      .select("challenge_session_id, status, contribution_status, access_status")
      .eq("user_id", userId)
      .in("challenge_session_id", sessionIds),
    (supabase as any)
      .from("challenge_sessions")
      .select("id, participation_type")
      .in("id", sessionIds),
  ]);

  const types = new Map<string, string | null>(
    ((sessRes?.data ?? []) as any[]).map((s) => [s.id, s.participation_type ?? null]),
  );
  for (const p of (partRes?.data ?? []) as any[]) {
    if (isParticipantEligible(p, types.get(p.challenge_session_id))) {
      eligible.add(p.challenge_session_id);
    }
  }
  return eligible;
}

/** Whether the signed-in user may take part in one parayanam. */
export async function fetchIsEligibleForSession(userId: string, sessionId: string): Promise<boolean> {
  const set = await fetchEligibleSessionIds(userId, [sessionId]);
  return set.has(sessionId);
}
