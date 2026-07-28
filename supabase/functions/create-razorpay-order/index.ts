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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const uid = userData.user.id;

    let body: { plan_key?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const planKey = typeof body.plan_key === "string" ? body.plan_key.trim() : "";
    if (!planKey) return json({ error: "plan_key is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: plan, error: planErr } = await admin
      .from("subscription_plans").select("*").eq("plan_key", planKey).eq("is_active", true).maybeSingle();
    if (planErr) return json({ error: planErr.message }, 500);
    if (!plan) return json({ error: "Plan not found" }, 404);
    if (plan.is_trial) return json({ error: "Trial plans don't require payment" }, 400);
    if (plan.price_inr == null || plan.price_inr <= 0) return json({ error: "This plan has no price set yet" }, 400);

    const amountPaise = Math.round(Number(plan.price_inr) * 100);

    const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `sub_${uid.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: uid, plan_key: planKey },
      }),
    });
    const order = await orderResp.json();
    if (!orderResp.ok) return json({ error: order?.error?.description || "Could not create Razorpay order" }, 500);

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: uid,
      subscription_plan_id: plan.id,
      razorpay_order_id: order.id,
      amount: plan.price_inr,
      currency: "INR",
      payment_status: "created",
      transaction_type: "subscription",
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: razorpayKeyId,
      plan_key: planKey,
      plan_display_name: plan.display_name,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
