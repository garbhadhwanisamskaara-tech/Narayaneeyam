import { useState, useCallback, useEffect, useRef } from "react";
import { getProgress, saveProgress, type BookmarkEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const keyOf = (dashakam: number, verse: number) => `${dashakam}-${verse}`;

const sortDesc = (list: BookmarkEntry[]) =>
  [...list].sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));

/** Look up meter numbers for a set of dashakams. */
async function fetchMeters(entries: { dashakam: number; verse: number }[]) {
  const map = new Map<string, string>();
  const dashakams = [...new Set(entries.map((e) => e.dashakam))];
  if (dashakams.length === 0) return map;
  const { data } = await (supabase as any)
    .from("verses_audio")
    .select("dashakam_no, verse_no, meter")
    .in("dashakam_no", dashakams);
  (data || []).forEach((r: any) => {
    if (r.meter) map.set(keyOf(r.dashakam_no, r.verse_no), String(r.meter));
  });
  return map;
}

/**
 * Bookmarks ("saved places").
 * Signed in  → Supabase `bookmarks` table is the ONLY store (local copies are
 *              cleared once migrated, so nothing is duplicated).
 * Signed out → localStorage only, exactly as before.
 */
export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(
    () => sortDesc(getProgress().bookmarkEntries || [])
  );
  const syncedForUser = useRef<string | null>(null);

  /** Signed in → memory only (cloud is source of truth). Signed out → localStorage. */
  const persist = useCallback(
    (list: BookmarkEntry[]) => {
      if (!user) saveProgress({ bookmarkEntries: list });
      setBookmarks(list);
    },
    [user]
  );

  // ── Load from Cloud (+ one-time migration of local entries) ────────────────
  useEffect(() => {
    if (!user) return;
    if (syncedForUser.current === user.id) return;
    syncedForUser.current = user.id;

    let cancelled = false;

    (async () => {
      try {
        const local = getProgress();
        const localEntries = local.bookmarkEntries || [];

        // One-time upload of anything saved before this device had an account
        if (!local.bookmarksSyncedAt && localEntries.length > 0) {
          const rows = localEntries.map((b) => ({
            user_id: user.id,
            dashakam: b.dashakam,
            verse: b.verse,
            saved_at: b.savedAt || new Date().toISOString(),
          }));
          const { error } = await (supabase as any)
            .from("bookmarks")
            .upsert(rows, { onConflict: "user_id,dashakam,verse", ignoreDuplicates: true });
          if (!error) {
            // Migrated → drop the local duplicates entirely
            saveProgress({ bookmarksSyncedAt: new Date().toISOString(), bookmarkEntries: [] });
          }
        } else if (!local.bookmarksSyncedAt) {
          saveProgress({ bookmarksSyncedAt: new Date().toISOString(), bookmarkEntries: [] });
        } else if ((local.bookmarkEntries || []).length > 0) {
          // Already migrated on a previous session — clear leftovers
          saveProgress({ bookmarkEntries: [] });
        }

        const { data, error } = await (supabase as any)
          .from("bookmarks")
          .select("dashakam, verse, saved_at")
          .order("saved_at", { ascending: false });
        if (error || cancelled || !data) return;

        const localByKey = new Map(
          localEntries.map((b) => [keyOf(b.dashakam, b.verse), b])
        );
        const meters = await fetchMeters(data as any[]);
        if (cancelled) return;

        const merged: BookmarkEntry[] = data.map((r: any) => {
          const k = keyOf(r.dashakam, r.verse);
          const match = localByKey.get(k);
          return {
            verseId: k,
            dashakam: r.dashakam,
            verse: r.verse,
            meter: meters.get(k) || match?.meter,
            mode: match?.mode || "chant",
            savedAt: r.saved_at || match?.savedAt || new Date().toISOString(),
          };
        });
        setBookmarks(sortDesc(merged));
      } catch {
        // Offline / failure — keep whatever is in memory
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refresh = () => {
    if (!user) setBookmarks(sortDesc(getProgress().bookmarkEntries || []));
  };

  const isBookmarked = useCallback(
    (verseId: string) => bookmarks.some((b) => b.verseId === verseId),
    [bookmarks]
  );

  const addBookmark = useCallback(
    (entry: Omit<BookmarkEntry, "savedAt">, isPodcast = false) => {
      const existing = bookmarks;
      if (existing.some((b) => b.verseId === entry.verseId)) return;

      const isFirst = existing.length === 0;
      const newEntry: BookmarkEntry = { ...entry, savedAt: new Date().toISOString() };
      persist([newEntry, ...existing]);

      if (user) {
        void (supabase as any)
          .from("bookmarks")
          .upsert(
            {
              user_id: user.id,
              dashakam: newEntry.dashakam,
              verse: newEntry.verse,
              saved_at: newEntry.savedAt,
            },
            { onConflict: "user_id,dashakam,verse", ignoreDuplicates: true }
          )
          .then(({ error }: any) => {
            if (error) console.warn("[bookmarks] save failed", error.message);
          });
      }

      toast({
        title: isFirst
          ? "Your first saved place — we'll always bring you right back. 🪔"
          : isPodcast
          ? "🔖 Podcast bookmarked at this moment."
          : "🔖 Your place is saved. Come back whenever you're ready.",
      });
    },
    [user, persist, bookmarks]
  );

  const removeBookmark = useCallback(
    (verseId: string) => {
      const existing = bookmarks;
      const target = existing.find((b) => b.verseId === verseId);
      persist(existing.filter((b) => b.verseId !== verseId));

      if (user && target) {
        void (supabase as any)
          .from("bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("dashakam", target.dashakam)
          .eq("verse", target.verse)
          .then(({ error }: any) => {
            if (error) console.warn("[bookmarks] remove failed", error.message);
          });
      }
    },
    [user, persist, bookmarks]
  );

  const undoRemoveBookmark = useCallback(
    (entry: BookmarkEntry) => {
      const existing = bookmarks;
      if (!existing.some((b) => b.verseId === entry.verseId)) {
        persist([entry, ...existing]);
      }

      if (user) {
        void (supabase as any)
          .from("bookmarks")
          .upsert(
            {
              user_id: user.id,
              dashakam: entry.dashakam,
              verse: entry.verse,
              saved_at: entry.savedAt || new Date().toISOString(),
            },
            { onConflict: "user_id,dashakam,verse", ignoreDuplicates: true }
          )
          .then(({ error }: any) => {
            if (error) console.warn("[bookmarks] undo failed", error.message);
          });
      }
    },
    [user, persist, bookmarks]
  );

  const mostRecent = bookmarks.length > 0 ? bookmarks[0] : null;

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark, mostRecent, refresh };
}
