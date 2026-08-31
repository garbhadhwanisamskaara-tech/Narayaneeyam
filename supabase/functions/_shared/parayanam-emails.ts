// Shared, server-side delivery of Parayanam transactional emails.
//
// All recipient data (email, names, parayanam name, dates) is resolved here
// from the database using IDs only — nothing is ever taken from the browser.
// Idempotency is guaranteed through public.app_email_log.event_key.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ParayanamEmailEvent = "PARAYANAM_CONFIRMED" | "PARAYANAM_STARTING";

export const APP_URL = Deno.env.get("APP_BASE_URL") ?? "https://www.narayaneeyam.app";
const FROM = Deno.env.get("APP_EMAIL_FROM") ?? "Narayaneeyam.app <noreply@narayaneeyam.app>";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

/** Statuses that mean the parayanam itself is no longer live. */
const DEAD_SESSION_STATES = ["ARCHIVED", "CANCELLED", "DRAFT"];

interface ParticipantContext {
  participantId: string;
  userId: string;
  sessionId: string;
  status: string;
  contributionStatus: string | null;
  participationType: string | null;
  parayanamName: string;
  startDate: string | null;
  groupId: string | null;
  recipientEmail: string | null;
  recipientName: string;
}

/** Loads everything needed for one participant's email, or null when unusable. */
export async function loadParticipantContext(
  db: SupabaseClient,
  participantId: string,
): Promise<ParticipantContext | null> {
  const { data: p } = await db
    .from("parayanam_participants")
    .select("id, user_id, challenge_session_id, status, contribution_status")
    .eq("id", participantId)
    .maybeSingle();
  if (!p) return null;

  const { data: s } = await db
    .from("challenge_sessions")
    .select("id, parayanam_name, start_date, group_id, participation_type, technical_state")
    .eq("id", p.challenge_session_id)
    .maybeSingle();
  if (!s) return null;
  if (s.technical_state && DEAD_SESSION_STATES.includes(String(s.technical_state))) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("id, display_name, email")
    .eq("id", p.user_id)
    .maybeSingle();

  return {
    participantId: p.id,
    userId: p.user_id,
    sessionId: p.challenge_session_id,
    status: p.status,
    contributionStatus: p.contribution_status ?? null,
    participationType: s.participation_type ?? null,
    parayanamName: s.parayanam_name ?? "Parayanam",
    startDate: s.start_date ?? null,
    groupId: s.group_id ?? null,
    recipientEmail: profile?.email ?? null,
    recipientName: profile?.display_name ?? "Devotee",
  };
}

/** A participant still belongs to the parayanam (never declined or left). */
export function isActiveParticipant(ctx: ParticipantContext): boolean {
  return ctx.status === "confirmed";
}

/**
 * Server-side eligibility for PARAYANAM_CONFIRMED.
 * FREE: acceptance alone. PAID: acceptance AND a confirmed contribution.
 */
export function isFullyConfirmed(ctx: ParticipantContext): boolean {
  if (ctx.status !== "confirmed") return false;
  if (ctx.participationType === "PAID") return ctx.contributionStatus === "confirmed";
  return true;
}

export function eventKey(event: ParayanamEmailEvent, sessionId: string, userId: string): string {
  return `${event}:${sessionId}:${userId}`;
}

/** True when this exact email has already gone out successfully. */
async function alreadySent(db: SupabaseClient, key: string): Promise<boolean> {
  const { data } = await db.from("app_email_log").select("id").eq("event_key", key).eq("status", "sent").limit(1);
  return !!(data && data.length);
}

async function logEmail(
  db: SupabaseClient,
  row: {
    event_key: string;
    event_type: string;
    status: "sent" | "failed";
    recipient_email: string | null;
    participant_id: string | null;
    challenge_session_id: string | null;
    error_message?: string | null;
  },
): Promise<void> {
  try {
    await db.from("app_email_log").insert({
      ...row,
      error_message: row.error_message ?? null,
      sent_at: row.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (e) {
    console.error("app_email_log insert failed", row.event_key, e);
  }
}

function formatDate(d: string | null): string {
  if (!d) return "soon";
  try {
    return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

/** Shared teal/white card shell, matching the existing app email style. */
function shell(bodyHtml: string, buttonLabel: string, buttonUrl: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f5f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
      <tr><td style="background:#0f6f72;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:600;">Narayaneeyam.app</td></tr>
      <tr><td style="padding:24px;color:#2c2c2c;font-size:15px;line-height:1.7;">
        ${bodyHtml}
        <p style="margin:28px 0 8px;">
          <a href="${buttonUrl}" style="display:inline-block;background:#0f6f72;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;">${buttonLabel}</a>
        </p>
        <p style="margin:24px 0 0;color:#8a6a1f;font-size:14px;">Sri Guruvayurappa Sharanam 🙏</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function buildEmail(event: ParayanamEmailEvent, ctx: ParticipantContext): { subject: string; html: string } {
  const destination = ctx.groupId ? `${APP_URL}/groups/${ctx.groupId}` : `${APP_URL}/my-parayanams`;
  if (event === "PARAYANAM_CONFIRMED") {
    return {
      subject: "Your Parayanam is confirmed 🙏",
      html: shell(
        `<p style="margin:0 0 12px;">Namaskaram ${escapeHtml(ctx.recipientName)},</p>
         <p style="margin:0 0 12px;">Your sacred space for<br/><strong>&ldquo;${escapeHtml(ctx.parayanamName)}&rdquo;</strong><br/>is confirmed.</p>
         <p style="margin:0;">We look forward to walking this sacred journey together.</p>`,
        "Open Parayanam",
        destination,
      ),
    };
  }
  return {
    subject: "Your Parayanam begins soon 🙏",
    html: shell(
      `<p style="margin:0 0 12px;">Namaskaram ${escapeHtml(ctx.recipientName)},</p>
       <p style="margin:0 0 12px;">Your Parayanam<br/><strong>&ldquo;${escapeHtml(ctx.parayanamName)}&rdquo;</strong><br/>begins on ${escapeHtml(formatDate(ctx.startDate))}.</p>
       <p style="margin:0 0 12px;">May this sacred journey bring you closer to Sri Guruvayurappan.</p>
       <p style="margin:0;">Use Narayaneeyam.app to follow your daily Dashakams and continue your Parayanam.</p>`,
      "Open Narayaneeyam.app",
      destination,
    ),
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export type SendOutcome = "sent" | "skipped" | "duplicate" | "failed";

/**
 * Sends one parayanam email if — and only if — the server-side eligibility and
 * idempotency checks pass. Never throws: email is secondary to the business
 * transaction that triggered it.
 */
export async function sendParayanamEmail(
  db: SupabaseClient,
  event: ParayanamEmailEvent,
  participantId: string,
): Promise<SendOutcome> {
  try {
    const ctx = await loadParticipantContext(db, participantId);
    if (!ctx) return "skipped";
    if (!isActiveParticipant(ctx)) return "skipped";
    if (event === "PARAYANAM_CONFIRMED" && !isFullyConfirmed(ctx)) return "skipped";
    if (!ctx.recipientEmail) return "skipped";

    const key = eventKey(event, ctx.sessionId, ctx.userId);
    if (await alreadySent(db, key)) return "duplicate";

    const { subject, html } = buildEmail(event, ctx);

    if (!RESEND_API_KEY) {
      await logEmail(db, {
        event_key: key,
        event_type: event,
        status: "failed",
        recipient_email: ctx.recipientEmail,
        participant_id: ctx.participantId,
        challenge_session_id: ctx.sessionId,
        error_message: "RESEND_API_KEY is not configured",
      });
      return "failed";
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [ctx.recipientEmail], subject, html }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("email send failed", key, res.status, text);
      await logEmail(db, {
        event_key: key,
        event_type: event,
        status: "failed",
        recipient_email: ctx.recipientEmail,
        participant_id: ctx.participantId,
        challenge_session_id: ctx.sessionId,
        error_message: `${res.status}: ${text}`.slice(0, 500),
      });
      return "failed";
    }

    await logEmail(db, {
      event_key: key,
      event_type: event,
      status: "sent",
      recipient_email: ctx.recipientEmail,
      participant_id: ctx.participantId,
      challenge_session_id: ctx.sessionId,
    });
    return "sent";
  } catch (e) {
    console.error("sendParayanamEmail crashed", event, participantId, e);
    return "failed";
  }
}

/**
 * Sweeps every confirmed participant of a session (or of all live sessions) and
 * sends any PARAYANAM_CONFIRMED email that is due but has not gone out yet.
 * This is what makes bulk CSV confirmation and direct SQL changes work.
 */
export async function sweepConfirmed(db: SupabaseClient, sessionId?: string | null): Promise<number> {
  let q = db.from("parayanam_participants").select("id").eq("status", "confirmed");
  if (sessionId) q = q.eq("challenge_session_id", sessionId);
  const { data } = await q;
  let sent = 0;
  for (const row of (data ?? []) as { id: string }[]) {
    if ((await sendParayanamEmail(db, "PARAYANAM_CONFIRMED", row.id)) === "sent") sent++;
  }
  return sent;
}
