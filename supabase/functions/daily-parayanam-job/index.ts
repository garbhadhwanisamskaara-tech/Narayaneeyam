// supabase/functions/daily-parayanam-job/index.ts
//
// Daily dispatcher for parayanam reminders. Pulls today's assigned dashakams
// per user from get_todays_reminders() and sends a single consolidated push.
// Handles both group parayanams (group_name present) and personal sessions
// (group_name null).

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

  return new Response(JSON.stringify({ sent, failed, users: byUser.size }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
