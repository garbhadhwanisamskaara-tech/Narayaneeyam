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

/**
 * Creates a Razorpay order for a PAID parayanam contribution.
 * Safe to call repeatedly -- each call simply creates a fresh order.
 *
 * The `payments` row carries the parayanam id in `notes.parayanam_id` (and the
 * Razorpay order carries it in its own notes) so the existing
 * verify-razorpay-payment / webhook parayanam branch can locate and confirm
 * the matching parayanam_participants row.
 */
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

    let body: { parayanam_id?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const parayanamId = typeof body.parayanam_id === "string" ? body.parayanam_id.trim() : "";
    if (!parayanamId) return json({ error: "parayanam_id is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sessionErr } = await admin
      .from("challenge_sessions")
      .select("id, parayanam_name, participation_type, contribution_amount, technical_state")
      .eq("id", parayanamId)
      .maybeSingle();
    if (sessionErr) return json({ error: sessionErr.message }, 500);
    if (!session) return json({ error: "Parayanam not found" }, 404);
    if (session.participation_type !== "PAID") {
      return json({ error: "This parayanam does not require a contribution" }, 400);
    }
    if (session.contribution_amount == null || Number(session.contribution_amount) <= 0) {
      return json({ error: "This parayanam has no contribution amount set" }, 400);
    }

    // The caller must actually be a participant of this parayanam.
    const { data: participant, error: partErr } = await admin
      .from("parayanam_participants")
      .select("id, status, contribution_status")
      .eq("challenge_session_id", parayanamId)
      .eq("user_id", uid)
      .maybeSingle();
    if (partErr) return json({ error: partErr.message }, 500);
    if (!participant) return json({ error: "You are not a participant of this parayanam" }, 403);
    if (participant.contribution_status === "confirmed" || participant.contribution_status === "not_required") {
      return json({ error: "Your contribution is already confirmed" }, 400);
    }

    const amountPaise = Math.round(Number(session.contribution_amount) * 100);

    const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `par_${uid.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: uid, parayanam_id: parayanamId, transaction_type: "parayanam_contribution" },
      }),
    });
    const order = await orderResp.json();
    if (!orderResp.ok) return json({ error: order?.error?.description || "Could not create Razorpay order" }, 500);

    const { error: insertErr } = await admin.from("payments").insert({
      user_id: uid,
      razorpay_order_id: order.id,
      amount: session.contribution_amount,
      currency: "INR",
      payment_status: "created",
      transaction_type: "parayanam_contribution",
      notes: { parayanam_id: parayanamId, participant_id: participant.id },
    });
    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({
      order_id: order.id,
      amount: amountPaise,
      currency: "INR",
      key_id: razorpayKeyId,
      parayanam_id: parayanamId,
      parayanam_name: session.parayanam_name,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
