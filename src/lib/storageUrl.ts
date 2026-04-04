import { supabase } from "@/integrations/supabase/client";

const BUCKET = "Narayaneeyam";

/**
 * Convert a relative storage path (e.g. "Chant/SN001/SN001-01.mp3")
 * into a full public URL from Supabase Storage.
 * Returns empty string if path is falsy or already a full URL.
 */
export function getStorageUrl(path: string | null | undefined): string {
  if (!path) return "";
  // Already a full URL — return as-is
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  // Strip leading slash if present
  const clean = path.startsWith("/") ? path.slice(1) : path;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(clean);
  return data?.publicUrl ?? "";
}
