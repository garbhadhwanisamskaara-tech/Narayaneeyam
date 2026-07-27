import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const uid = userData.user.id;

    // Clean up dependent rows first, children before parents,
    // so the final auth.users delete doesn't hit a foreign key error.
    const cleanupSteps: Array<{ label: string; run: () => Promise<{ error: any }> }> = [
      { label: "playlist_progress", run: () => admin.from("playlist_progress").delete().eq("user_id", uid) },
      { label: "ticket_updates", run: () => admin.from("ticket_updates").delete().eq("user_id", uid) },
      { label: "support_tickets", run: () => admin.from("support_tickets").delete().eq("user_id", uid) },
      { label: "group_members", run: () => admin.from("group_members").delete().eq("user_id", uid) },
      { label: "feathers", run: () => admin.from("feathers").delete().eq("user_id", uid) },
      { label: "user_roles", run: () => admin.from("user_roles").delete().eq("user_id", uid) },
      { label: "push_subscriptions", run: () => admin.from("push_subscriptions").delete().eq("user_id", uid) },
      { label: "notification_log", run: () => admin.from("notification_log").delete().eq("user_id", uid) },
      { label: "payments", run: () => admin.from("payments").delete().eq("user_id", uid) },
      { label: "member_progress", run: () => admin.from("member_progress").delete().eq("user_id", uid) },
      { label: "user_progress", run: () => admin.from("user_progress").delete().eq("user_id", uid) },
      { label: "certificates", run: () => admin.from("certificates").delete().eq("user_id", uid) },
      { label: "challenge_sessions", run: () => admin.from("challenge_sessions").delete().eq("user_id", uid) },
      { label: "active_sessions", run: () => admin.from("active_sessions").delete().eq("user_id", uid) },
      { label: "app_events", run: () => admin.from("app_events").delete().eq("user_id", uid) },
      { label: "user_playlists", run: () => admin.from("user_playlists").delete().eq("user_id", uid) },
      {
        label: "parayanam_schedule",
        run: () => admin.from("parayanam_schedule").update({ assigned_user_id: null }).eq("assigned_user_id", uid),
      },
      { label: "profiles", run: () => admin.from("profiles").delete().eq("id", uid) },
    ];

    for (const step of cleanupSteps) {
      const { error } = await step.run();
      if (error) {
        console.error(`Cleanup failed at ${step.label}:`, error.message);
        return new Response(JSON.stringify({ error: `Failed while cleaning up ${step.label}: ${error.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
