import { useState, useCallback } from "react";
import { getProgress, saveProgress, type FavouriteEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";

export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteEntry[]>(() => getProgress().favouriteEntries || []);

  const isFavourited = useCallback(
    (verseId: string) => favourites.some((f) => f.verseId === verseId),
    [favourites]
  );

  const addFavourite = useCallback(
    (entry: Omit<FavouriteEntry, "savedAt">) => {
      const current = getProgress();
      const existing = current.favouriteEntries || [];
      if (existing.some((f) => f.verseId === entry.verseId)) {
        toast({ title: "Already in your heart. It was always yours. ❤️" });
        return;
      }

      const isFirst = existing.length === 0;
      const newEntry: FavouriteEntry = { ...entry, savedAt: new Date().toISOString() };
      const updated = [newEntry, ...existing];
      saveProgress({ favouriteEntries: updated });
      setFavourites(updated);

      toast({
        title: isFirst
          ? "Your first favourite — every Parayanam has one sloka that speaks to the soul first. 🌸"
          : "❤️ Added to your heart. This sloka is yours forever.",
      });
    },
    []
  );

  const removeFavourite = useCallback(
    (verseId: string) => {
      const current = getProgress();
      const updated = (current.favouriteEntries || []).filter((f) => f.verseId !== verseId);
      saveProgress({ favouriteEntries: updated });
      setFavourites(updated);
    },
    []
  );

  const undoRemoveFavourite = useCallback(
    (entry: FavouriteEntry) => {
      const current = getProgress();
      const updated = [entry, ...(current.favouriteEntries || [])];
      saveProgress({ favouriteEntries: updated });
      setFavourites(updated);
    },
    []
  );

  const randomFavourite = favourites.length > 0
    ? favourites[Math.floor(Math.random() * favourites.length)]
    : null;

  return { favourites, isFavourited, addFavourite, removeFavourite, undoRemoveFavourite, randomFavourite };
}
