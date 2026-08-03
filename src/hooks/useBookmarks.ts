import { useState, useCallback, useEffect, useRef } from "react";
import { getProgress, saveProgress, type BookmarkEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const keyOf = (dashakam: number, verse: number) => `${dashakam}-${verse}`;

const sortDesc = (list: BookmarkEntry[]) =>
  [...list].sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));

/**
 * Bookmarks ("saved places").
 * Signed in  → Supabase `bookmarks` table (source of truth) + localStorage mirror.
 * Signed out → localStorage only, exactly as before.
 */
export function useBookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(
    () => sortDesc(getProgress().bookmarkEntries || [])
  );
  const syncedForUser = useRef<string | null>(null);

  const persistLocal = useCallback((list: BookmarkEntry[]) => {
    saveProgress({ bookmarkEntries: list });
    setBookmarks(list);
  }, []);

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
          if (!error) saveProgress({ bookmarksSyncedAt: new Date().toISOString() });
        } else if (!local.bookmarksSyncedAt) {
          saveProgress({ bookmarksSyncedAt: new Date().toISOString() });
        }

        const { data, error } = await (supabase as any)
          .from("bookmarks")
          .select("dashakam, verse, saved_at")
          .order("saved_at", { ascending: false });
        if (error || cancelled || !data) return;

        // Merge: cloud is the set of entries, local supplies extra metadata (mode)
        const localByKey = new Map(
          (getProgress().bookmarkEntries || []).map((b) => [keyOf(b.dashakam, b.verse), b])
        );
        const merged: BookmarkEntry[] = data.map((r: any) => {
          const match = localByKey.get(keyOf(r.dashakam, r.verse));
          return {
            verseId: keyOf(r.dashakam, r.verse),
            dashakam: r.dashakam,
            verse: r.verse,
            mode: match?.mode || "chant",
            savedAt: r.saved_at || match?.savedAt || new Date().toISOString(),
          };
        });
        persistLocal(sortDesc(merged));
      } catch {
        // Offline / failure — keep the local mirror as-is
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, persistLocal]);

  const refresh = () => {
    setBookmarks(sortDesc(getProgress().bookmarkEntries || []));
  };

  const isBookmarked = useCallback(
    (verseId: string) => bookmarks.some((b) => b.verseId === verseId),
    [bookmarks]
  );

  const addBookmark = useCallback(
    (entry: Omit<BookmarkEntry, "savedAt">, isPodcast = false) => {
      const existing = getProgress().bookmarkEntries || [];
      if (existing.some((b) => b.verseId === entry.verseId)) return;

      const isFirst = existing.length === 0;
      const newEntry: BookmarkEntry = { ...entry, savedAt: new Date().toISOString() };
      persistLocal([newEntry, ...existing]);

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
    [user, persistLocal]
  );

  const removeBookmark = useCallback(
    (verseId: string) => {
      const existing = getProgress().bookmarkEntries || [];
      const target = existing.find((b) => b.verseId === verseId);
      persistLocal(existing.filter((b) => b.verseId !== verseId));

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
    [user, persistLocal]
  );

  const undoRemoveBookmark = useCallback(
    (entry: BookmarkEntry) => {
      const existing = getProgress().bookmarkEntries || [];
      if (!existing.some((b) => b.verseId === entry.verseId)) {
        persistLocal([entry, ...existing]);
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
    [user, persistLocal]
  );

  const mostRecent = bookmarks.length > 0 ? bookmarks[0] : null;

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark, mostRecent, refresh };
}
