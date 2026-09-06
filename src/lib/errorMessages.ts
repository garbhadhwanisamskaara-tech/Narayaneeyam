const TECHNICAL_PATTERNS = [
  /upstream connect error/i,
  /disconnect\/reset before headers/i,
  /econnreset/i,
  /failed to fetch/i,
  /networkerror/i,
  /fetch failed/i,
  /gateway timeout/i,
  /connection timeout/i,
  /timed out waiting/i,
  /502|503|504/,
];

/**
 * Returns a message safe to show users. Passes through genuine app-level
 * error messages (e.g. from a Postgres RAISE EXCEPTION meant for the user),
 * but replaces raw network/proxy/infra errors with a friendly fallback.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  const message = err instanceof Error ? err.message : typeof err === "string" ? err : (err as any)?.message;
  if (!message) return fallback;
  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(message))) return fallback;
  return message;
}
