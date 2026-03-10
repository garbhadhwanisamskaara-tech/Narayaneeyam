/**
 * B2 Audio URL helper
 *
 * Fetches authorized download URLs for private B2 audio files
 * via the b2-audio Edge Function.
 *
 * Audio Naming Convention (as per spec):
 *   Chant/Podcast: SL{DDD}-{VV}.m4a        e.g. SL001-01.m4a
 *   Learn:         SL{DDD}-{VV}_Learn.m4a   e.g. SL001-01_Learn.m4a
 *   Sloka:         SL{DDD}-{VV}_Sloka{NN}_{VV}.m4a
 *   Sloka Learn:   SL{DDD}-{VV}_Sloka{NN}_{VV}_Learn.m4a
 */

/** Cache authorized URLs (valid ~1 hour, we cache for 50 min) */
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 minutes

/** Zero-pad a number to given width */
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

/**
 * Get an authorized download URL for a B2 audio file.
 * @param fileName e.g. "SL001-01.m4a" or "audio/SL001-01.m4a"
 */
export async function getAudioUrl(fileName: string): Promise<string> {
  // Normalize: strip leading slash or "audio/" prefix if present
  const cleanName = fileName.replace(/^\/?(audio\/)?/, "");

  const cached = urlCache.get(cleanName);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.url;
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    // Fallback to local files when Supabase isn't configured
    return `/audio/${cleanName}`;
  }

  const fnUrl = `${supabaseUrl}/functions/v1/b2-audio?file=${encodeURIComponent(cleanName)}`;

  const res = await fetch(fnUrl, {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Failed to get B2 audio URL:", errText);
    return `/audio/${cleanName}`;
  }

  const result = await res.json();
  const url = result.url;

  urlCache.set(cleanName, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  return url;
}

/**
 * Get the audio file name for a dashakam verse (Chant/Podcast).
 * Pattern: SL{DDD}-{VV}.m4a
 */
export function getVerseFileName(dashakam: number, verse: number): string {
  return `SL${pad(dashakam, 3)}-${pad(verse, 2)}.m4a`;
}

/**
 * Get the Learn audio file name for a dashakam verse.
 * Pattern: SL{DDD}-{VV}_Learn.m4a
 */
export function getVerseLearnFileName(dashakam: number, verse: number): string {
  return `SL${pad(dashakam, 3)}-${pad(verse, 2)}_Learn.m4a`;
}

/**
 * Get the audio file name for a sloka verse (Chant/Podcast).
 * Pattern: SL{DDD}-{VV}_Sloka{NN}_{VV}.m4a
 */
export function getSlokaFileName(dashakam: number, verse: number, slokaNum: number, slokaVerse: number): string {
  return `SL${pad(dashakam, 3)}-${pad(verse, 2)}_Sloka${pad(slokaNum, 2)}_${pad(slokaVerse, 2)}.m4a`;
}

/**
 * Get the Learn audio file name for a sloka verse.
 * Pattern: SL{DDD}-{VV}_Sloka{NN}_{VV}_Learn.m4a
 */
export function getSlokaLearnFileName(dashakam: number, verse: number, slokaNum: number, slokaVerse: number): string {
  return `SL${pad(dashakam, 3)}-${pad(verse, 2)}_Sloka${pad(slokaNum, 2)}_${pad(slokaVerse, 2)}_Learn.m4a`;
}

/**
 * Get the audio file name for a full dashakam.
 * Pattern: SL{DDD}.m4a
 */
export function getDashakamFileName(dashakam: number): string {
  return `SL${pad(dashakam, 3)}.m4a`;
}
