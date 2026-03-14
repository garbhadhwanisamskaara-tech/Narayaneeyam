import { useState, useCallback } from "react";
import { getProgress, saveProgress, type BookmarkEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(() => getProgress().bookmarkEntries || []);

  const refresh = () => {
    setBookmarks(getProgress().bookmarkEntries || []);
  };

  const isBookmarked = useCallback(
    (verseId: string) => bookmarks.some((b) => b.verseId === verseId),
    [bookmarks]
  );

  const addBookmark = useCallback(
    (entry: Omit<BookmarkEntry, "savedAt">, isPodcast = false) => {
      const current = getProgress();
      const existing = (current.bookmarkEntries || []);
      if (existing.some((b) => b.verseId === entry.verseId)) return;

      const isFirst = existing.length === 0;
      const newEntry: BookmarkEntry = { ...entry, savedAt: new Date().toISOString() };
      const updated = [newEntry, ...existing];
      saveProgress({ bookmarkEntries: updated });
      setBookmarks(updated);

      toast({
        title: isFirst
          ? "Your first saved place — we'll always bring you right back. 🪔"
          : isPodcast
          ? "🔖 Podcast bookmarked at this moment."
          : "🔖 Your place is saved. Come back whenever you're ready.",
      });
    },
    []
  );

  const removeBookmark = useCallback(
    (verseId: string) => {
      const current = getProgress();
      const updated = (current.bookmarkEntries || []).filter((b) => b.verseId !== verseId);
      saveProgress({ bookmarkEntries: updated });
      setBookmarks(updated);
    },
    []
  );

  const undoRemoveBookmark = useCallback(
    (entry: BookmarkEntry) => {
      const current = getProgress();
      const updated = [entry, ...(current.bookmarkEntries || [])];
      saveProgress({ bookmarkEntries: updated });
      setBookmarks(updated);
    },
    []
  );

  const mostRecent = bookmarks.length > 0 ? bookmarks[0] : null;

  return { bookmarks, isBookmarked, addBookmark, removeBookmark, undoRemoveBookmark, mostRecent, refresh };
}
