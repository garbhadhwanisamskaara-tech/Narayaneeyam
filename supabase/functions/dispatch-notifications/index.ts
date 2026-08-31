// supabase/functions/dispatch-notifications/index.ts
//
// Single dispatcher for all push notifications -- both time-based
// (checked every 5 min via SQL "who's due" functions) and
// event-based (drained from notification_queue, populated by
// Postgres triggers the instant something happens).
//
// Requires: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY provided automatically)

import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidSubject = Deno.env.get("VAPID_SUBJECT")!;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

type Payload = { title: string; body: string; url: string };

/** Replace {{key}} placeholders in a template using the given vars. */
function renderTemplate(template: Payload, vars: Record<string, unknown>): Payload {
  const fill = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`));
  return { title: fill(template.title), body: fill(template.body), url: fill(template.url) };
}

const templateCache = new Map<string, Payload>();
async function getTemplate(notificationType: string): Promise<Payload | null> {
  if (templateCache.has(notificationType)) return templateCache.get(notificationType)!;
  const { data } = await supabase
    .from("notification_templates")
    .select("title, body, url")
    .eq("notification_type", notificationType)
    .single();
  if (!data) return null;
  templateCache.set(notificationType, data);
  return data;
}

// ------------------------------------------------------------
// Shared: send one push message to one user, clean up dead
// subscriptions, log it (optionally tagged with reference_id for
// per-item dedup, e.g. a specific festival).
// ------------------------------------------------------------
async function sendToUser(
  client: SupabaseClient,
  userId: string,
  notificationType: string,
  payload: Payload,
  referenceId?: string,
): Promise<{ sent: number; failed: number }> {
  const { data: subs } = await client.from("push_subscriptions").select("*").eq("user_id", userId);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const message = JSON.stringify(payload);

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
          await client.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );

  await client.from("notification_log").insert({
    user_id: userId,
    notification_type: notificationType,
    channel: "push",
    delivered: sent > 0,
    reference_id: referenceId ?? null,
  });

  return { sent, failed };
}

async function sendInBatches(
  items: { userId: string; referenceId?: string; vars?: Record<string, unknown> }[],
  notificationType: string,
  batchSize = 25,
): Promise<{ sent: number; failed: number }> {
  const template = await getTemplate(notificationType);
  if (!template) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((item) =>
        sendToUser(
          supabase,
          item.userId,
          notificationType,
          item.vars ? renderTemplate(template, item.vars) : template,
          item.referenceId,
        ),
      ),
    );
    for (const r of results) {
      sent += r.sent;
      failed += r.failed;
    }
  }
  return { sent, failed };
}

// ------------------------------------------------------------
// Time-based handlers -- each calls its own "who's due" SQL
// function, checked every run.
// ------------------------------------------------------------
type Handler = { notificationType: string; run: () => Promise<{ sent: number; failed: number }> };

const timeBasedHandlers: Handler[] = [
  {
    notificationType: "daily_reminder",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_reminder", { window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(data.map((r: { user_id: string }) => ({ userId: r.user_id })), "daily_reminder");
    },
  },
  {
    notificationType: "missed_day",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_missed_day", { window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(data.map((r: { user_id: string }) => ({ userId: r.user_id })), "missed_day");
    },
  },
  {
    notificationType: "festival_before",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_festival", { p_when: "before", window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(
        data.map((r: { user_id: string; festival_id: string; festival_name: string }) => ({
          userId: r.user_id,
          referenceId: r.festival_id,
          vars: { festival_name: r.festival_name },
        })),
        "festival_before",
      );
    },
  },
  {
    notificationType: "festival_day",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_festival", { p_when: "day_of", window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(
        data.map((r: { user_id: string; festival_id: string; festival_name: string }) => ({
          userId: r.user_id,
          referenceId: r.festival_id,
          vars: { festival_name: r.festival_name },
        })),
        "festival_day",
      );
    },
  },
  {
    notificationType: "renewal_reminder",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_renewal_reminder", { window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(data.map((r: { user_id: string }) => ({ userId: r.user_id })), "renewal_reminder");
    },
  },
  {
    notificationType: "subscription_expired",
    run: async () => {
      const { data } = await supabase.rpc("get_users_due_for_expiry_notice", { window_minutes: 5 });
      if (!data?.length) return { sent: 0, failed: 0 };
      return sendInBatches(data.map((r: { user_id: string }) => ({ userId: r.user_id })), "subscription_expired");
    },
  },
];

// ------------------------------------------------------------
// Event-based: drain notification_queue (populated by triggers).
// ------------------------------------------------------------
async function drainQueue(): Promise<{ sent: number; failed: number; processed: number }> {
  const { data: pending } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .limit(200);

  if (!pending?.length) return { sent: 0, failed: 0, processed: 0 };

  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    const template = await getTemplate(item.notification_type);
    if (!template) {
      await supabase.from("notification_queue").update({ status: "failed" }).eq("id", item.id);
      continue;
    }
    const payload = renderTemplate(template, item.template_vars ?? {});
    // reference_id (when present) makes the log row a permanent dedup marker,
    // e.g. one parayanam_confirmed per participant row.
    const result = await sendToUser(
      supabase,
      item.user_id,
      item.notification_type,
      payload,
      item.reference_id ?? undefined,
    );
    sent += result.sent;
    failed += result.failed;
    await supabase
      .from("notification_queue")
      .update({ status: result.sent > 0 ? "sent" : "failed", sent_at: new Date().toISOString() })
      .eq("id", item.id);
  }

  return { sent, failed, processed: pending.length };
}

Deno.serve(async (_req) => {
  const results: Record<string, unknown> = {};

  for (const handler of timeBasedHandlers) {
    try {
      results[handler.notificationType] = await handler.run();
    } catch (err) {
      results[handler.notificationType] = { sent: 0, failed: 0 };
      console.error(`Handler ${handler.notificationType} failed:`, err);
    }
  }

  try {
    results["event_queue"] = await drainQueue();
  } catch (err) {
    results["event_queue"] = { sent: 0, failed: 0, processed: 0 };
    console.error("Queue drain failed:", err);
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
