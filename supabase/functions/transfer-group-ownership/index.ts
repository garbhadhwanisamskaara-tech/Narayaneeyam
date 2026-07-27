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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authenticated" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const uid = userData.user.id;

    let body: { group_id?: string; new_owner_id?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    const groupId = typeof body.group_id === "string" ? body.group_id.trim() : "";
    if (!groupId) return json({ error: "group_id is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: group, error: groupErr } = await admin
      .from("groups")
      .select("id, group_name, owner_id")
      .eq("id", groupId)
      .maybeSingle();
    if (groupErr) return json({ error: groupErr.message }, 500);
    if (!group) return json({ error: "Group not found" }, 404);
    if (group.owner_id !== uid) return json({ error: "Only the group owner can transfer ownership" }, 403);

    let newOwnerId = typeof body.new_owner_id === "string" ? body.new_owner_id.trim() : "";

    // Validate the chosen member, or auto-pick the longest-standing member.
    const { data: members, error: membersErr } = await admin
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .neq("user_id", uid)
      .order("joined_at", { ascending: true });
    if (membersErr) return json({ error: membersErr.message }, 500);

    const eligible = members ?? [];
    if (eligible.length === 0) return json({ error: "This group has no other members to transfer to" }, 400);

    if (newOwnerId) {
      if (!eligible.some((m) => m.user_id === newOwnerId)) {
        return json({ error: "Selected member is not part of this group" }, 400);
      }
    } else {
      newOwnerId = eligible[0].user_id;
    }

    const { error: updateErr } = await admin
      .from("groups")
      .update({ owner_id: newOwnerId })
      .eq("id", groupId)
      .eq("owner_id", uid);
    if (updateErr) return json({ error: updateErr.message }, 500);

    // Best-effort role bump; ignore failures if the column/role isn't present.
    await admin.from("group_members").update({ role: "owner" }).eq("group_id", groupId).eq("user_id", newOwnerId);

    return json({ success: true, group_id: groupId, new_owner_id: newOwnerId });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
