// Server-side dispatcher for PARAYANAM_CONFIRMED (and, on demand,
// PARAYANAM_STARTING) transactional emails.
//
// The browser may only pass IDs. Recipient, subject and body are always
// resolved server-side; this is deliberately NOT a generic mail relay.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendParayanamEmail, serviceClient, sweepConfirmed } from "../_shared/parayanam-emails.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Any signed-in user may ask us to re-evaluate a participant; eligibility
  // itself is decided from the database, so this cannot leak or forge emails.
  const authHeader = req.headers.get("Authorization") ?? "";
  const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await anon.auth.getUser();
  if (!auth?.user) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const db = serviceClient();
  const participantId = typeof body.participant_id === "string" ? body.participant_id : null;
  const sessionId = typeof body.session_id === "string" ? body.session_id : null;
  const eventType = body.event_type === "PARAYANAM_STARTING" ? "PARAYANAM_STARTING" : "PARAYANAM_CONFIRMED";

  if (participantId) {
    const result = await sendParayanamEmail(db, eventType, participantId);
    return json({ result });
  }

  if (sessionId) {
    const sent = await sweepConfirmed(db, sessionId);
    return json({ sent });
  }

  return json({ error: "participant_id or session_id is required" }, 400);
});
