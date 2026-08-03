import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { getProgress, saveProgress, type FavouriteEntry } from "@/lib/progress";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_FAVOURITE_LANGUAGE = "en";

const keyOf = (dashakam: number, verse: number) => `${dashakam}-${verse}`;

const sortDesc = (list: FavouriteEntry[]) =>
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
 * Favourites are language-scoped: only entries saved in the currently active
 * language are shown. Others stay stored and reappear when the user switches back.
 *
 * Signed in  → Supabase `favourites` table is the ONLY store (local copies are
 *              cleared once migrated, so nothing is duplicated).
 * Signed out → localStorage only, exactly as before.
 */
export function useFavourites(languageOverride?: string) {
  const { user, profile } = useAuth();
  const activeLanguage =
    languageOverride || profile?.preferred_script_language || DEFAULT_FAVOURITE_LANGUAGE;

  const [allFavourites, setAllFavourites] = useState<FavouriteEntry[]>(
    () => sortDesc(getProgress().favouriteEntries || [])
  );
  const syncedForUser = useRef<string | null>(null);

  /** Signed in → memory only (cloud is source of truth). Signed out → localStorage. */
  const persist = useCallback(
    (list: FavouriteEntry[]) => {
      if (!user) saveProgress({ favouriteEntries: list });
      setAllFavourites(list);
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
          if (!error) {
            // Migrated → drop the local duplicates entirely
            saveProgress({ favouritesSyncedAt: new Date().toISOString(), favouriteEntries: [] });
          }
        } else if (!local.favouritesSyncedAt) {
          saveProgress({ favouritesSyncedAt: new Date().toISOString(), favouriteEntries: [] });
        } else if ((local.favouriteEntries || []).length > 0) {
          saveProgress({ favouriteEntries: [] });
        }

        const { data, error } = await (supabase as any)
          .from("favourites")
          .select("dashakam, verse, saved_at")
          .order("saved_at", { ascending: false });
        if (error || cancelled || !data) return;

        const localByKey = new Map(
          localEntries.map((f) => [keyOf(f.dashakam, f.verse), f])
        );
        const meters = await fetchMeters(data as any[]);
        if (cancelled) return;

        let merged: FavouriteEntry[] = data.map((r: any) => {
          const k = keyOf(r.dashakam, r.verse);
          const match = localByKey.get(k);
          return {
            verseId: k,
            dashakam: r.dashakam,
            verse: r.verse,
            sanskrit: match?.sanskrit || "",
            meter: meters.get(k) || match?.meter,
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
        setAllFavourites(sortDesc(merged));
      } catch {
        // Offline / failure — keep whatever is in memory
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, activeLanguage]);

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
      const existing = allFavourites;
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
      persist([newEntry, ...existing]);

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
          ? "Your first favourite — every Parayanam has one verse that speaks to the soul first. 🌸"
          : "❤️ Added to your heart. This verse is yours forever.",
      });
    },
    [activeLanguage, user, persist, allFavourites]
  );

  const removeFavourite = useCallback(
    (verseId: string) => {
      const existing = allFavourites;
      const target = existing.find(
        (f) =>
          f.verseId === verseId &&
          (f.language || DEFAULT_FAVOURITE_LANGUAGE) === activeLanguage
      );
      persist(
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
    [activeLanguage, user, persist, allFavourites]
  );

  const undoRemoveFavourite = useCallback(
    (entry: FavouriteEntry) => {
      const existing = allFavourites;
      if (!existing.some((f) => f.verseId === entry.verseId && f.language === entry.language)) {
        persist([entry, ...existing]);
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
    [user, persist, allFavourites]
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
