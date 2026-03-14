import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bookmark, ArrowLeft } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import BookmarkButton from "@/components/BookmarkButton";
import RemoveBottomSheet from "@/components/RemoveBottomSheet";
import { toast } from "@/hooks/use-toast";
import type { BookmarkEntry } from "@/lib/progress";

export default function SavedPlacesPage() {
  const { bookmarks, removeBookmark, undoRemoveBookmark } = useBookmarks();
  const [removeTarget, setRemoveTarget] = useState<BookmarkEntry | null>(null);

  const handleRemoveConfirm = () => {
    if (!removeTarget) return;
    const entry = removeTarget;
    removeBookmark(entry.verseId);
    setRemoveTarget(null);

    toast({
      title: "Bookmark removed.",
      action: (
        <button
          onClick={() => undoRemoveBookmark(entry)}
          className="text-xs font-sans font-semibold text-bookmark-gold underline"
        >
          Undo
        </button>
      ),
    });
  };

  const getResumePath = (b: BookmarkEntry) => {
    const mode = b.mode === "dashboard" ? "chant" : b.mode;
    return `/${mode}?dashakam=${b.dashakam}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <Link to="/dashboard" className="p-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Bookmark className="h-6 w-6 fill-bookmark-gold text-bookmark-gold" />
              Where you left off
            </h1>
            <p className="text-sm text-muted-foreground font-sans">
              {bookmarks.length} saved place{bookmarks.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {bookmarks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold text-foreground mb-2">No reading places yet.</h2>
            <p className="text-sm text-muted-foreground font-sans mb-6 max-w-sm mx-auto leading-relaxed">
              As you chant, learn, or read — tap 🔖 to mark where you are. We'll bring you right back.
            </p>
            <Link
              to="/chant?dashakam=1"
              className="inline-block rounded-lg bg-gradient-gold px-6 py-3 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
            >
              Start with Dasakam 1 →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookmarks.map((bm, i) => (
              <motion.div
                key={bm.verseId + bm.savedAt}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-bookmark-gold/20 bg-card p-4 flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-semibold text-foreground">
                    Dasakam {bm.dashakam} · Sloka {bm.verse}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-sans capitalize">
                    {bm.mode} mode · {new Date(bm.savedAt).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={getResumePath(bm)}
                  className="rounded-lg bg-gradient-gold px-4 py-2 text-xs font-sans font-semibold text-primary shadow-gold transition-transform hover:scale-105 shrink-0"
                >
                  Continue
                </Link>
                <BookmarkButton
                  active
                  onClick={() => setRemoveTarget(bm)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <RemoveBottomSheet
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveConfirm}
        type="bookmark"
        dashakam={removeTarget?.dashakam || 0}
        verse={removeTarget?.verse || 0}
      />
    </div>
  );
}
