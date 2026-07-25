// Base URL for the Cloudflare R2 public bucket (custom domain, e.g. https://cdn.narayaneeyam.app).
// Set VITE_AUDIO_CDN_URL in your .env / Vercel project settings.
// Falls back to a placeholder so misconfiguration is obvious in dev rather than silently
// resolving to a broken relative URL.
const DEFAULT_AUDIO_CDN_URL = "https://cdn.narayaneeyam.app";
const AUDIO_BASE_URL = (import.meta.env.VITE_AUDIO_CDN_URL || DEFAULT_AUDIO_CDN_URL).replace(/\/+$/, "");

/**
 * Convert a relative storage path (e.g. "Chant/SN001/SN001-01.mp3")
 * into a full public URL served from the Cloudflare R2 CDN.
 * Returns empty string if path is falsy or already a full URL.
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return "";
  // Already a full URL — return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!AUDIO_BASE_URL) {
    console.error("VITE_AUDIO_CDN_URL is not set — audio files cannot be resolved.");
    return "";
  }
  // Strip leading slash if present
  const clean = path.startsWith("/") ? path.slice(1) : path;
  return `${AUDIO_BASE_URL}/${clean}`;
}
