import { useCallback, useState } from "react";

/**
 * Per-device dismiss for individual bell notification rows (parayanam
 * invites, awaiting-contribution items, support-ticket replies). Purely a
 * declutter preference — stored in localStorage like ticketViews.ts, not the
 * database — so dismissing a row only hides it from the bell on this
 * browser; it never changes the underlying invite, payment, or ticket state.
 * If something still needs real action (confirm/decline, pay, or a reply
 * worth reading), that stays true whether or not it's showing in the bell.
 */
const KEY = "narayaneeyam:dismissedNotifications";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function persist(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* best-effort only */
  }
}

export function useDismissedNotifications() {
  const [dismissed, setDismissed] = useState<Set<string>>(load);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      persist(next);
      return next;
    });
  }, []);

  const isDismissed = useCallback((id: string) => dismissed.has(id), [dismissed]);

  return { isDismissed, dismiss };
}