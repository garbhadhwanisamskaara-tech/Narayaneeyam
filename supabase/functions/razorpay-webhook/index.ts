import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

async function activateSubscription(admin: ReturnType<typeof createClient>, payment: any, plan: any) {
  const now = new Date();
  const { data: profile } = await admin
    .from("profiles").select("subscription_end, subscription_status").eq("id", payment.user_id).maybeSingle();
  const currentEnd = profile?.subscription_end ? new Date(profile.subscription_end) : null;
  const base = currentEnd && currentEnd > now && profile?.subscription_status === "active" ? currentEnd : now;
  const newEnd = new Date(base.getTime() + plan.duration_days * 86400000);

  await admin.from("profiles").update({
    subscription_plan_id: plan.id,
    subscription_status: "active",
    subscription_start: now.toISOString(),
    subscription_end: newEnd.toISOString(),
  }).eq("id", payment.user_id);

  await admin.from("notification_queue").insert({
    user_id: payment.user_id,
    notification_type: "payment_success",
    status: "pending",
    template_vars: { plan_name: plan.display_name, amount: payment.amount },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
    const signature = req.headers.get("X-Razorpay-Signature");
    if (!signature) return json({ error: "Missing signature" }, 400);

    // Signature must be verified over the exact raw body bytes -- read as text
    // before any JSON parsing, or the hash will never match.
    const rawBody = await req.text();
    const valid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!valid) return json({ error: "Invalid signature" }, 400);

    const event = JSON.parse(rawBody);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      if (!orderId || !paymentId) return json({ received: true, skipped: "missing order/payment id" });

      const { data: payment, error: payErr } = await admin
        .from("payments").select("*").eq("razorpay_order_id", orderId).maybeSingle();
      if (payErr) return json({ error: payErr.message }, 500);
      if (!payment) return json({ received: true, skipped: "no matching payment record" });
      if (payment.payment_status === "paid") return json({ received: true, already_processed: true });

      const { data: plan, error: planErr } = await admin
        .from("subscription_plans").select("*").eq("id", payment.subscription_plan_id).maybeSingle();
      if (planErr || !plan) return json({ received: true, skipped: "plan not found" });

      await admin.from("payments").update({
        razorpay_payment_id: paymentId,
        payment_status: "paid",
        payment_method: paymentEntity.method ?? null,
        paid_at: new Date().toISOString(),
      }).eq("id", payment.id);

      await activateSubscription(admin, payment, plan);
      return json({ received: true, processed: true });
    }

    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (!orderId) return json({ received: true, skipped: "missing order id" });

      const { data: payment } = await admin
        .from("payments").select("id, payment_status").eq("razorpay_order_id", orderId).maybeSingle();
      if (payment && payment.payment_status !== "paid") {
        await admin.from("payments").update({
          payment_status: "failed",
          notes: { failure_reason: paymentEntity?.error_description ?? "Unknown" },
        }).eq("id", payment.id);
      }
      return json({ received: true });
    }

    // Acknowledge any other event type without acting on it.
    return json({ received: true, ignored_event: event.event });
  } catch (e) {
    console.error("Webhook processing error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
