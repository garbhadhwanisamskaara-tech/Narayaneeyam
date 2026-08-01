import { useState, useCallback, useMemo } from "react";
import { getProgress, saveProgress, type FavouriteEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const DEFAULT_FAVOURITE_LANGUAGE = "en";

/**
 * Favourites are language-scoped: only entries saved in the currently active
 * language are shown. Others stay stored and reappear when the user switches back.
 */
export function useFavourites(languageOverride?: string) {
  const { profile } = useAuth();
  const activeLanguage =
    languageOverride || profile?.preferred_script_language || DEFAULT_FAVOURITE_LANGUAGE;

  const [allFavourites, setAllFavourites] = useState<FavouriteEntry[]>(
    () => getProgress().favouriteEntries || []
  );

  const favourites = useMemo(
    () =>
      allFavourites.filter(
        (f) => (f.language || DEFAULT_FAVOURITE_LANGUAGE) === activeLanguage
      ),
    [allFavourites, activeLanguage]
  );

  const isFavourited = useCallback(
    (verseId: string) => favourites.some((f) => f.verseId === verseId),
    [favourites]
  );

  const addFavourite = useCallback(
    (entry: Omit<FavouriteEntry, "savedAt">) => {
      const current = getProgress();
      const existing = current.favouriteEntries || [];
      const language = entry.language || activeLanguage;
      if (
        existing.some(
          (f) =>
            f.verseId === entry.verseId &&
            (f.language || DEFAULT_FAVOURITE_LANGUAGE) === language
        )
      ) {
        toast({ title: "Already in your heart. It was always yours. ❤️" });
        return;
      }

      const isFirst = existing.length === 0;
      const newEntry: FavouriteEntry = {
        ...entry,
        language,
        savedAt: new Date().toISOString(),
      };
      const updated = [newEntry, ...existing];
      saveProgress({ favouriteEntries: updated });
      setAllFavourites(updated);

      toast({
        title: isFirst
          ? "Your first favourite — every Parayanam has one sloka that speaks to the soul first. 🌸"
          : "❤️ Added to your heart. This sloka is yours forever.",
      });
    },
    [activeLanguage]
  );

  const removeFavourite = useCallback(
    (verseId: string) => {
      const current = getProgress();
      const updated = (current.favouriteEntries || []).filter(
        (f) =>
          !(
            f.verseId === verseId &&
            (f.language || DEFAULT_FAVOURITE_LANGUAGE) === activeLanguage
          )
      );
      saveProgress({ favouriteEntries: updated });
      setAllFavourites(updated);
    },
    [activeLanguage]
  );

  const undoRemoveFavourite = useCallback((entry: FavouriteEntry) => {
    const current = getProgress();
    const updated = [entry, ...(current.favouriteEntries || [])];
    saveProgress({ favouriteEntries: updated });
    setAllFavourites(updated);
  }, []);

  const randomFavourite =
    favourites.length > 0
      ? favourites[Math.floor(Math.random() * favourites.length)]
      : null;

  return {
    favourites,
    isFavourited,
    addFavourite,
    removeFavourite,
    undoRemoveFavourite,
    randomFavourite,
    activeLanguage,
  };
}
