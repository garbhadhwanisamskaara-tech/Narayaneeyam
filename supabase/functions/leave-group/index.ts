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

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const uid = userData.user.id;

    let body: { group_id?: string; new_owner_id?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const groupId = typeof body.group_id === "string" ? body.group_id.trim() : "";
    if (!groupId) return json({ error: "group_id is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: group, error: groupErr } = await admin
      .from("groups").select("id, owner_id").eq("id", groupId).maybeSingle();
    if (groupErr) return json({ error: groupErr.message }, 500);
    if (!group) return json({ error: "Group not found" }, 404);

    const { count: otherCount, error: countErr } = await admin
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId).neq("user_id", uid).is("left_at", null);
    if (countErr) return json({ error: countErr.message }, 500);

    if (group.owner_id === uid) {
      if ((otherCount ?? 0) > 0) {
        // Must transfer ownership first — delegate to the existing function.
        const transferResp = await fetch(`${supabaseUrl}/functions/v1/transfer-group-ownership`, {
          method: "POST",
          headers: { Authorization: authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ group_id: groupId, new_owner_id: body.new_owner_id }),
        });
        const transferPayload = await transferResp.json();
        if (!transferResp.ok) return json(transferPayload, transferResp.status);
      }
      // Sole owner, or transfer just completed — mark this membership as left.
    }

    const { error: leaveErr } = await admin
      .from("group_members")
      .update({ left_at: new Date().toISOString() })
      .eq("group_id", groupId).eq("user_id", uid);
    if (leaveErr) return json({ error: leaveErr.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
