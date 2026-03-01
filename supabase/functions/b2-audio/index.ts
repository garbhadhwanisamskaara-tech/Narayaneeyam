import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** B2 authorize_account response cache (valid ~24h, we refresh every 12h) */
let b2Auth: { apiUrl: string; authToken: string; expiresAt: number } | null = null;

async function getB2Auth() {
  if (b2Auth && Date.now() < b2Auth.expiresAt) return b2Auth;

  const keyId = Deno.env.get("B2_APPLICATION_KEY_ID");
  const appKey = Deno.env.get("B2_APPLICATION_KEY");
  if (!keyId || !appKey) throw new Error("B2 credentials not configured");

  const res = await fetch("https://api.backblazeb2.com/b2api/v2/b2_authorize_account", {
    headers: {
      Authorization: "Basic " + btoa(`${keyId}:${appKey}`),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`B2 auth failed [${res.status}]: ${body}`);
  }

  const data = await res.json();
  b2Auth = {
    apiUrl: data.apiUrl,
    authToken: data.authorizationToken,
    expiresAt: Date.now() + 12 * 60 * 60 * 1000, // refresh after 12h
  };
  return b2Auth;
}

async function getDownloadAuth(bucketId: string, filePrefix: string, validSec = 3600) {
  const auth = await getB2Auth();
  const res = await fetch(`${auth.apiUrl}/b2api/v2/b2_get_download_authorization`, {
    method: "POST",
    headers: {
      Authorization: auth.authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bucketId,
      fileNamePrefix: filePrefix,
      validDurationInSeconds: validSec,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`B2 download auth failed [${res.status}]: ${body}`);
  }

  return await res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const filePath = url.searchParams.get("file");

    if (!filePath) {
      return new Response(JSON.stringify({ error: "Missing 'file' parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bucketName = Deno.env.get("B2_BUCKET_NAME");
    if (!bucketName) throw new Error("B2_BUCKET_NAME not configured");

    // We need the bucketId for download authorization.
    // Get it from authorize_account → allowed.bucketId (if key is scoped to one bucket)
    // or list buckets. For simplicity, we'll use b2_list_buckets.
    const auth = await getB2Auth();

    // List buckets to find our bucket ID
    const lbRes = await fetch(`${auth.apiUrl}/b2api/v2/b2_list_buckets`, {
      method: "POST",
      headers: {
        Authorization: auth.authToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId: "", bucketName }),
    });

    if (!lbRes.ok) {
      const body = await lbRes.text();
      throw new Error(`B2 list_buckets failed [${lbRes.status}]: ${body}`);
    }

    const lbData = await lbRes.json();
    const bucket = lbData.buckets?.[0];
    if (!bucket) throw new Error(`Bucket '${bucketName}' not found`);

    // Get download authorization for this specific file
    const dlAuth = await getDownloadAuth(bucket.bucketId, filePath, 3600);

    // Construct the authorized download URL
    const downloadUrl = `${auth.apiUrl}/file/${bucketName}/${filePath}?Authorization=${dlAuth.authorizationToken}`;

    return new Response(JSON.stringify({ url: downloadUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("B2 audio error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
