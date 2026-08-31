// supabase/functions/daily-parayanam-job/index.ts
//
// Daily dispatcher for parayanam reminders. Pulls today's assigned dashakams
// per user from get_todays_reminders() and sends a single consolidated push.
// Handles both group parayanams (group_name present) and personal sessions
// (group_name null).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { sendParayanamEmail, sweepConfirmed } from "../_shared/parayanam-emails.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function sendPush(userId: string, title: string, body: string): Promise<{ sent: number; failed: number }> {
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const message = JSON.stringify({ title, body, url: "/progress" });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          message,
        );
        sent++;
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  return { sent, failed };
}

Deno.serve(async (_req) => {
  const { data: reminders } = await supabase.rpc("get_todays_reminders");
  const byUser = new Map<string, { groupName: string | null; dashakams: number[] }>();

  for (const row of reminders ?? []) {
    const entry = byUser.get(row.user_id) ?? { groupName: row.group_name, dashakams: [] };
    entry.dashakams.push(row.dashakam_no);
    byUser.set(row.user_id, entry);
  }

  let sent = 0;
  let failed = 0;

  for (const [userId, info] of byUser) {
    const dashakamText = info.dashakams.length === 1
      ? `Dashakam ${info.dashakams[0]}`
      : `Dashakams ${info.dashakams.join(", ")}`;
    const body = info.groupName
      ? `Gentle reminder to chant ${dashakamText} assigned to you as part of the parayanam of Group ${info.groupName}`
      : `Gentle reminder to chant ${dashakamText} for today's parayanam`;
    const result = await sendPush(userId, "Today's chanting", body);
    sent += result.sent;
    failed += result.failed;
  }

  // ---- Transactional emails, riding on this existing daily schedule ----
  // Email failures must never affect the reminder run above.
  const emails = { starting: 0, confirmed: 0 };
  try {
    emails.starting = await sendStartingEmails();
  } catch (e) {
    console.error("PARAYANAM_STARTING pass failed", e);
  }
  try {
    // Safety net: catches confirmations made by bulk CSV, RPCs or direct SQL.
    emails.confirmed = await sweepConfirmed(supabase);
  } catch (e) {
    console.error("PARAYANAM_CONFIRMED sweep failed", e);
  }
  let invitesSwept = 0;
  try {
    // Safety net for auto-invites created by the group_members database
    // trigger, which has no browser to fire the invitation email.
    invitesSwept = await sweepInvites();
  } catch (e) {
    console.error("PARAYANAM_INVITE sweep failed", e);
  }

  return new Response(JSON.stringify({ sent, failed, users: byUser.size, emails, invitesSwept }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});

/** Live (non-archived) sessions whose start_date is today or tomorrow. */
async function sendStartingEmails(): Promise<number> {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const { data: sessions } = await supabase
    .from("challenge_sessions")
    .select("id, technical_state")
    .in("start_date", [iso(today), iso(tomorrow)]);

  const ids = ((sessions ?? []) as { id: string; technical_state: string | null }[])
    .filter((s) => !["ARCHIVED", "CANCELLED", "DRAFT"].includes(String(s.technical_state ?? "")))
    .map((s) => s.id);
  if (!ids.length) return 0;

  const { data: participants } = await supabase
    .from("parayanam_participants")
    .select("id")
    .in("challenge_session_id", ids)
    .eq("status", "confirmed");

  let count = 0;
  for (const p of (participants ?? []) as { id: string }[]) {
    if ((await sendParayanamEmail(supabase, "PARAYANAM_STARTING", p.id)) === "sent") count++;
  }
  return count;
}

/**
 * Sends the existing PARAYANAM_INVITE email for any participant that is still
 * 'invited' and has no successful invite email logged yet. This covers rows
 * created server-side by the auto-invite trigger (group joins), where no React
 * screen is open. It re-uses the deployed `send-app-email` function — no second
 * email implementation — and `send-app-email`'s own app_email_log/event_key
 * idempotency remains the final protection against duplicates.
 */
async function sweepInvites(): Promise<number> {
  const { data: sessions } = await supabase.from("challenge_sessions").select("id, technical_state");
  const liveIds = ((sessions ?? []) as { id: string; technical_state: string | null }[])
    .filter((s) => !["ARCHIVED", "CANCELLED", "DRAFT"].includes(String(s.technical_state ?? "")))
    .map((s) => s.id);
  if (!liveIds.length) return 0;

  const { data: participants } = await supabase
    .from("parayanam_participants")
    .select("id")
    .in("challenge_session_id", liveIds)
    .eq("status", "invited");
  const ids = ((participants ?? []) as { id: string }[]).map((p) => p.id);
  if (!ids.length) return 0;

  const { data: logged } = await supabase
    .from("app_email_log")
    .select("participant_id")
    .eq("event_type", "PARAYANAM_INVITE")
    .eq("status", "sent")
    .in("participant_id", ids);
  const done = new Set(((logged ?? []) as { participant_id: string | null }[]).map((r) => r.participant_id));

  let sent = 0;
  for (const id of ids) {
    if (done.has(id)) continue;
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-app-email`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ event_type: "PARAYANAM_INVITE", participant_id: id }),
      });
      if (res.ok) sent++;
      else console.error("send-app-email PARAYANAM_INVITE failed", id, res.status, await res.text());
    } catch (e) {
      console.error("send-app-email PARAYANAM_INVITE crashed", id, e);
    }
  }
  return sent;
}
