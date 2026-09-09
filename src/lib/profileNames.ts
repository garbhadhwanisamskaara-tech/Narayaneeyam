import { supabase } from "@/integrations/supabase/client";

const CHUNK_SIZE = 100;

/**
 * Fetch display names for many user ids without hitting URL-length limits.
 * Chunks the ids (100 per request) and runs the queries in parallel,
 * merging the results into one map. Throws if any chunk fails so callers
 * can surface a visible error instead of silently falling back to "Member".
 */
export async function fetchProfileNames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    chunks.push(unique.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map((chunk) =>
      (supabase as any).from("profiles").select("id, display_name, email").in("id", chunk),
    ),
  );

  const nameById = new Map<string, string>();
  for (const res of results) {
    if (res.error) throw res.error;
    for (const p of (res.data ?? []) as any[]) {
      nameById.set(p.id, p.display_name ?? p.email ?? "Member");
    }
  }
  return nameById;
}
