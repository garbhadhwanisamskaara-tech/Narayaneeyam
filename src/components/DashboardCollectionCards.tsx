import { Link } from "react-router-dom";
import { Bookmark, Heart } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useFavourites } from "@/hooks/useFavourites";

export default function DashboardCollectionCards() {
  const { mostRecent } = useBookmarks();
  const { favourites, randomFavourite } = useFavourites();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Bookmark Card */}
      <div className="rounded-xl border border-bookmark-gold/30 bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="h-5 w-5 fill-bookmark-gold text-bookmark-gold" />
          <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Where you left off</span>
        </div>
        {mostRecent ? (
          <>
            <p className="font-display text-sm font-semibold text-foreground mb-1">
              Dasakam {mostRecent.dashakam} · Sloka {mostRecent.verse}
            </p>
            <p className="text-[10px] text-muted-foreground font-sans mb-3 capitalize">{mostRecent.mode} mode</p>
            <Link
              to={`/${mostRecent.mode === "dashboard" ? "chant" : mostRecent.mode}?dashakam=${mostRecent.dashakam}`}
              className="mt-auto rounded-lg bg-gradient-gold px-3 py-2 text-xs font-sans font-semibold text-primary text-center shadow-gold transition-transform hover:scale-105"
            >
              Continue
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed mb-3">
              Tap 🔖 while chanting to save your place.
            </p>
            <Link
              to="/chant?dashakam=1"
              className="mt-auto rounded-lg border border-border px-3 py-2 text-xs font-sans font-medium text-foreground text-center hover:bg-muted transition-colors"
            >
              Start with Dasakam 1 →
            </Link>
          </>
        )}
      </div>

      {/* Favourite Card */}
      <div className="rounded-xl border border-favourite-rose/30 bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-5 w-5 fill-favourite-rose text-favourite-rose" />
          <span className="text-xs text-muted-foreground font-sans uppercase tracking-wide">Close to your heart</span>
        </div>
        {favourites.length > 0 ? (
          <>
            <p className="font-display text-sm font-semibold text-foreground mb-1">
              {favourites.length} sloka{favourites.length !== 1 ? "s" : ""}
            </p>
            {randomFavourite && (
              <p className="text-[10px] text-muted-foreground font-sans line-clamp-2 mb-3 italic leading-relaxed">
                "{randomFavourite.sanskrit.split("\n")[0]}"
              </p>
            )}
            <Link
              to="/heart-shelf"
              className="mt-auto rounded-lg bg-favourite-rose/10 border border-favourite-rose/20 px-3 py-2 text-xs font-sans font-medium text-favourite-rose text-center hover:bg-favourite-rose/20 transition-colors"
            >
              Visit my heart shelf →
            </Link>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-sans leading-relaxed mb-3">
              When a sloka speaks to you, tap ❤️ to keep it close.
            </p>
            <Link
              to="/chant"
              className="mt-auto rounded-lg border border-border px-3 py-2 text-xs font-sans font-medium text-foreground text-center hover:bg-muted transition-colors"
            >
              Explore slokas →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
