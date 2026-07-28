import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(`${orderId}|${paymentId}`));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const uid = userData.user.id;

    let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ error: "Missing payment details" }, 400);
    }

    const valid = await verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpayKeySecret);
    if (!valid) return json({ error: "Payment signature verification failed" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: payment, error: payErr } = await admin
      .from("payments").select("*").eq("razorpay_order_id", razorpay_order_id).eq("user_id", uid).maybeSingle();
    if (payErr) return json({ error: payErr.message }, 500);
    if (!payment) return json({ error: "Payment record not found" }, 404);
    if (payment.payment_status === "paid") return json({ success: true, already_processed: true });

    const { data: plan, error: planErr } = await admin
      .from("subscription_plans").select("*").eq("id", payment.subscription_plan_id).maybeSingle();
    if (planErr || !plan) return json({ error: planErr?.message || "Plan not found" }, 500);

    const { error: updatePayErr } = await admin.from("payments").update({
      razorpay_payment_id, razorpay_signature, payment_status: "paid", paid_at: new Date().toISOString(),
    }).eq("id", payment.id);
    if (updatePayErr) return json({ error: updatePayErr.message }, 500);

    const { data: profile } = await admin
      .from("profiles").select("subscription_end, subscription_status").eq("id", uid).maybeSingle();
    const now = new Date();
    const currentEnd = profile?.subscription_end ? new Date(profile.subscription_end) : null;
    // Renewing before expiry extends from the current end date rather than losing the remaining days.
    const base = currentEnd && currentEnd > now && profile?.subscription_status === "active" ? currentEnd : now;
    const newEnd = new Date(base.getTime() + plan.duration_days * 86400000);

    const { error: profErr } = await admin.from("profiles").update({
      subscription_plan_id: plan.id,
      subscription_status: "active",
      subscription_start: now.toISOString(),
      subscription_end: newEnd.toISOString(),
    }).eq("id", uid);
    if (profErr) return json({ error: profErr.message }, 500);

    await admin.from("notification_queue").insert({
      user_id: uid,
      notification_type: "payment_success",
      status: "pending",
      template_vars: { plan_name: plan.display_name, amount: payment.amount },
    });

    return json({ success: true, subscription_end: newEnd.toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
