/**
 * Client-side "last viewed" tracking for support tickets.
 * There is no last_viewed_at column in the database, so a ticket reply stops
 * being an action item once the user opens that ticket on this device.
 */
const KEY = (ticketId: string) => `ticket-viewed-${ticketId}`;

export function getTicketViewedAt(ticketId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(KEY(ticketId));
  return raw ? Number(raw) || 0 : 0;
}

export function markTicketViewed(ticketId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY(ticketId), String(Date.now()));
  window.dispatchEvent(new CustomEvent("ticket-viewed", { detail: ticketId }));
}
