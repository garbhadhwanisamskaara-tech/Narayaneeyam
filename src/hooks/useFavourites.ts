import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { getProgress, saveProgress, type FavouriteEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_FAVOURITE_LANGUAGE = "en";

const keyOf = (dashakam: number, verse: number) => `${dashakam}-${verse}`;

const sortDesc = (list: FavouriteEntry[]) =>
  [...list].sort((a, b) => (b.savedAt || "").localeCompare(a.savedAt || ""));

/**
 * Favourites are language-scoped: only entries saved in the currently active
 * language are shown. Others stay stored and reappear when the user switches back.
 *
 * Signed in  → Supabase `favourites` table (source of truth) + localStorage mirror.
 * Signed out → localStorage only, exactly as before.
 *
 * The cloud table stores only dashakam + verse; the verse text and language of an
 * entry created on another device are resolved in the user's current script
 * language and cached in the local mirror.
 */
export function useFavourites(languageOverride?: string) {
  const { user, profile } = useAuth();
  const activeLanguage =
    languageOverride || profile?.preferred_script_language || DEFAULT_FAVOURITE_LANGUAGE;

  const [allFavourites, setAllFavourites] = useState<FavouriteEntry[]>(
    () => sortDesc(getProgress().favouriteEntries || [])
  );
  const syncedForUser = useRef<string | null>(null);

  const persistLocal = useCallback((list: FavouriteEntry[]) => {
    saveProgress({ favouriteEntries: list });
    setAllFavourites(list);
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
        const localEntries = local.favouriteEntries || [];

        if (!local.favouritesSyncedAt && localEntries.length > 0) {
          const rows = localEntries.map((f) => ({
            user_id: user.id,
            dashakam: f.dashakam,
            verse: f.verse,
            saved_at: f.savedAt || new Date().toISOString(),
          }));
          const { error } = await (supabase as any)
            .from("favourites")
            .upsert(rows, { onConflict: "user_id,dashakam,verse", ignoreDuplicates: true });
          if (!error) saveProgress({ favouritesSyncedAt: new Date().toISOString() });
        } else if (!local.favouritesSyncedAt) {
          saveProgress({ favouritesSyncedAt: new Date().toISOString() });
        }

        const { data, error } = await (supabase as any)
          .from("favourites")
          .select("dashakam, verse, saved_at")
          .order("saved_at", { ascending: false });
        if (error || cancelled || !data) return;

        const localByKey = new Map(
          (getProgress().favouriteEntries || []).map((f) => [keyOf(f.dashakam, f.verse), f])
        );

        let merged: FavouriteEntry[] = data.map((r: any) => {
          const match = localByKey.get(keyOf(r.dashakam, r.verse));
          return {
            verseId: keyOf(r.dashakam, r.verse),
            dashakam: r.dashakam,
            verse: r.verse,
            sanskrit: match?.sanskrit || "",
            language: match?.language || activeLanguage,
            savedAt: r.saved_at || match?.savedAt || new Date().toISOString(),
          };
        });

        // Resolve verse text for entries that arrived from another device
        const missing = merged.filter((f) => !f.sanskrit);
        if (missing.length > 0) {
          const dashakams = [...new Set(missing.map((f) => f.dashakam))];
          const { data: scriptRows } = await (supabase as any)
            .from("language_script")
            .select("dashakam_no, verse_no, transliteration_text")
            .in("dashakam_no", dashakams)
            .eq("language_code", activeLanguage);
          const textByKey = new Map(
            (scriptRows || []).map((r: any) => [keyOf(r.dashakam_no, r.verse_no), r.transliteration_text])
          );
          merged = merged.map((f) =>
            f.sanskrit
              ? f
              : { ...f, sanskrit: (textByKey.get(keyOf(f.dashakam, f.verse)) as string) || "" }
          );
        }

        if (cancelled) return;
        persistLocal(sortDesc(merged));
      } catch {
        // Offline / failure — keep the local mirror as-is
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, activeLanguage, persistLocal]);

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
      const existing = getProgress().favouriteEntries || [];
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
      persistLocal([newEntry, ...existing]);

      if (user) {
        void (supabase as any)
          .from("favourites")
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
            if (error) console.warn("[favourites] save failed", error.message);
          });
      }

      toast({
        title: isFirst
          ? "Your first favourite — every Parayanam has one sloka that speaks to the soul first. 🌸"
          : "❤️ Added to your heart. This sloka is yours forever.",
      });
    },
    [activeLanguage, user, persistLocal]
  );

  const removeFavourite = useCallback(
    (verseId: string) => {
      const existing = getProgress().favouriteEntries || [];
      const target = existing.find(
        (f) =>
          f.verseId === verseId &&
          (f.language || DEFAULT_FAVOURITE_LANGUAGE) === activeLanguage
      );
      persistLocal(
        existing.filter(
          (f) =>
            !(
              f.verseId === verseId &&
              (f.language || DEFAULT_FAVOURITE_LANGUAGE) === activeLanguage
            )
        )
      );

      if (user && target) {
        void (supabase as any)
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("dashakam", target.dashakam)
          .eq("verse", target.verse)
          .then(({ error }: any) => {
            if (error) console.warn("[favourites] remove failed", error.message);
          });
      }
    },
    [activeLanguage, user, persistLocal]
  );

  const undoRemoveFavourite = useCallback(
    (entry: FavouriteEntry) => {
      const existing = getProgress().favouriteEntries || [];
      if (!existing.some((f) => f.verseId === entry.verseId && f.language === entry.language)) {
        persistLocal([entry, ...existing]);
      }

      if (user) {
        void (supabase as any)
          .from("favourites")
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
            if (error) console.warn("[favourites] undo failed", error.message);
          });
      }
    },
    [user, persistLocal]
  );

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
