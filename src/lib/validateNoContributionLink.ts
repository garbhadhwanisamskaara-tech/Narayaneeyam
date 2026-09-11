// Blocks links inside contribution notes. Payment now happens in-app off the
// contribution amount alone, and the database carries a matching constraint —
// this check simply gives immediate feedback in the form.
const URL_PATTERN = /(https?:\/\/|www\.)\S+|(?:[a-z0-9-]+\.)+(?:com|io|in|co|me|link|page)\b\S*/i;

export function containsUrl(text: string): boolean {
  return URL_PATTERN.test(text);
}
