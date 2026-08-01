// Base URL for the Cloudflare R2 public bucket (custom domain, e.g. https://cdn.narayaneeyam.app).
// Set VITE_AUDIO_CDN_URL in your .env / Vercel project settings.
// Falls back to a placeholder so misconfiguration is obvious in dev rather than silently
// resolving to a broken relative URL.
const DEFAULT_AUDIO_CDN_URL = "https://cdn.narayaneeyam.app";
const AUDIO_BASE_URL = (import.meta.env.VITE_AUDIO_CDN_URL || DEFAULT_AUDIO_CDN_URL).replace(/\/+$/, "");

/**
 * Legacy Supabase Storage public URL shape:
 *   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
 * Old rows in the database may still hold these. We rewrite them onto the
 * Cloudflare R2 CDN so they don't break after the migration.
 */
const LEGACY_SUPABASE_STORAGE_RE =
  /^https?:\/\/[^/]+\.supabase\.(?:co|in)\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?.*)?$/;

/** Buckets whose contents were copied to the root of the R2 bucket. */
const STRIPPED_BUCKETS = new Set(["Narayaneeyam", "narayaneeyam", "audio"]);

/**
 * Convert a relative storage path (e.g. "Chant/SN001/SN001-01.mp3")
 * into a full public URL served from the Cloudflare R2 CDN.
 * Legacy absolute Supabase Storage URLs are rewritten onto the CDN.
 * Returns empty string if path is falsy.
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return "";

  const legacy = LEGACY_SUPABASE_STORAGE_RE.exec(path);
  if (legacy) {
    const [, bucket, objectPath] = legacy;
    const decoded = decodeURIComponent(objectPath);
    const clean = STRIPPED_BUCKETS.has(bucket) ? decoded : `${bucket}/${decoded}`;
    return AUDIO_BASE_URL ? `${AUDIO_BASE_URL}/${clean}` : path;
  }

  // Any other full URL — return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!AUDIO_BASE_URL) {
    console.error("VITE_AUDIO_CDN_URL is not set — audio files cannot be resolved.");
    return "";
  }
  // Strip leading slash if present
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${AUDIO_BASE_URL}/${clean}`;
}

