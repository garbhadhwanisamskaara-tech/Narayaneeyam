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

    let body: { group_id?: string } = {};
    try { body = await req.json(); } catch { body = {}; }
    const groupId = typeof body.group_id === "string" ? body.group_id.trim() : "";
    if (!groupId) return json({ error: "group_id is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: group, error: groupErr } = await admin
      .from("groups").select("id, group_name, owner_id").eq("id", groupId).maybeSingle();
    if (groupErr) return json({ error: groupErr.message }, 500);
    if (!group) return json({ error: "Group not found" }, 404);
    if (group.owner_id !== uid) return json({ error: "Only the group owner can dissolve this group" }, 403);

    // Cancel every group-linked parayanam. Individual feathers/member_progress rows
    // are untouched — they belong to each user independently.
    const { error: sessionsErr } = await admin
      .from("challenge_sessions")
      .update({ technical_state: "CANCELLED" })
      .eq("group_id", groupId);
    if (sessionsErr) return json({ error: sessionsErr.message }, 500);

    const { data: activeMembers, error: membersErr } = await admin
      .from("group_members").select("user_id").eq("group_id", groupId).is("left_at", null);
    if (membersErr) return json({ error: membersErr.message }, 500);

    const { error: leaveAllErr } = await admin
      .from("group_members")
      .update({ left_at: new Date().toISOString() })
      .eq("group_id", groupId).is("left_at", null);
    if (leaveAllErr) return json({ error: leaveAllErr.message }, 500);

    const { error: dissolveErr } = await admin
      .from("groups").update({ status: "dissolved" }).eq("id", groupId);
    if (dissolveErr) return json({ error: dissolveErr.message }, 500);

    const notifyRows = (activeMembers ?? []).map((m: { user_id: string }) => ({
      user_id: m.user_id,
      notification_type: "group_dissolved",
      status: "pending",
      template_vars: { group_name: group.group_name },
    }));
    if (notifyRows.length > 0) {
      const { error: notifyErr } = await admin.from("notification_queue").insert(notifyRows);
      if (notifyErr) console.error("Failed to queue dissolve notifications:", notifyErr.message);
    }

    return json({ success: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
