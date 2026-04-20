import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ArrowLeft } from "lucide-react";
import { useFavourites } from "@/hooks/useFavourites";
import FavouriteButton from "@/components/FavouriteButton";
import RemoveBottomSheet from "@/components/RemoveBottomSheet";
import { toast } from "@/hooks/use-toast";
import type { FavouriteEntry } from "@/lib/progress";
import SEO from "@/components/SEO";

export default function HeartShelfPage() {
  const { favourites, removeFavourite, undoRemoveFavourite } = useFavourites();
  const [removeTarget, setRemoveTarget] = useState<FavouriteEntry | null>(null);
  const [swipeMode, setSwipeMode] = useState(false);

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    const entry = removeTarget;
    removeFavourite(entry.verseId);
    setRemoveTarget(null);

    toast({
      title: "Removed from favourites. It will still be here in the text whenever you need it.",
      action: (
        <button
          onClick={() => undoRemoveFavourite(entry)}
          className="text-xs font-sans font-semibold text-favourite-rose underline"
        >
          Undo
        </button>
      ),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <SEO path="/heart-shelf" title="Favourites — Sriman Narayaneeyam" description="Your collection of favourite Narayaneeyam slokas — verses close to your heart, ready whenever you need them." />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="p-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 fill-favourite-rose text-favourite-rose" />
              Slokas close to your heart
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              {favourites.length} sloka{favourites.length !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>

        {favourites.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">Your heart shelf is empty.</h2>
            <p className="text-sm text-muted-foreground font-sans mb-6 max-w-sm mx-auto leading-relaxed">
              When a sloka speaks to you — and one will — tap ❤️ to keep it close forever.
            </p>
            <Link
              to="/chant"
              className="inline-block rounded-lg bg-gradient-gold px-6 py-3 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
            >
              Explore slokas →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favourites.map((fav, i) => (
              <motion.div
                key={fav.verseId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-favourite-rose/20 bg-card p-5"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs text-muted-foreground font-sans">
                    Dasakam {fav.dashakam} · Sloka {fav.verse}
                  </span>
                  <FavouriteButton
                    active
                    onClick={() => {
                      setRemoveTarget(fav);
                      setSwipeMode(false);
                    }}
                  />
                </div>
                <p className="font-body text-base text-foreground leading-relaxed whitespace-pre-line line-clamp-4">
                  {fav.sanskrit}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    to={`/chant?dashakam=${fav.dashakam}`}
                    className="text-xs font-sans text-primary hover:underline"
                  >
                    Chant →
                  </Link>
                  <Link
                    to={`/script?dashakam=${fav.dashakam}`}
                    className="text-xs font-sans text-primary hover:underline"
                  >
                    Read →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <RemoveBottomSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
        type="favourite"
        dashakam={removeTarget?.dashakam || 0}
        verse={removeTarget?.verse || 0}
        isSwipe={swipeMode}
      />
    </div>
  );
}
