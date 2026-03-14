import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  type: "bookmark" | "favourite";
  dashakam: number;
  verse: number;
  isSwipe?: boolean;
}

export default function RemoveBottomSheet({ open, onClose, onConfirm, type, dashakam, verse, isSwipe }: Props) {
  const isBookmark = type === "bookmark";

  const title = isBookmark
    ? "Remove this reading place?"
    : isSwipe
    ? "Letting this one go?"
    : "Remove from your heart?";

  const body = isBookmark
    ? `Dasakam ${dashakam} · Sloka ${verse} will be removed from your saved places.`
    : isSwipe
    ? "You can always favourite it again — it's not going anywhere."
    : `Dasakam ${dashakam} · Sloka ${verse} will be removed from your favourites. The sloka remains in the text — only your personal tag is removed.`;

  const confirmText = isBookmark
    ? "Yes, remove it"
    : isSwipe
    ? "Yes, let it go"
    : "Yes, remove it";

  const cancelText = "Keep it";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-2xl bg-card border-t border-border shadow-lg p-6"
          >
            <div className="flex justify-center mb-3">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground font-sans mb-6 leading-relaxed">{body}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-border bg-muted px-4 py-3 text-sm font-sans font-medium text-foreground transition-colors hover:bg-muted/80"
              >
                {cancelText}
              </button>
              <button
                onClick={() => { onConfirm(); onClose(); }}
                className="flex-1 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm font-sans font-medium text-destructive transition-colors hover:bg-destructive/20"
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
