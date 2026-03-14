import { Bookmark } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  active: boolean;
  onClick: () => void;
  size?: number;
}

export default function BookmarkButton({ active, onClick, size = 18 }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? "Remove bookmark from this sloka" : "Bookmark this sloka"}
      className="relative p-1 transition-colors"
    >
      <motion.div
        animate={active ? { scale: [1, 1.3, 1] } : { scale: 1 }}
        transition={{ duration: 0.35 }}
      >
        <Bookmark
          className={`transition-all duration-300 ${
            active
              ? "fill-bookmark-gold text-bookmark-gold"
              : "fill-none text-muted-foreground hover:text-bookmark-gold"
          }`}
          style={{ width: size, height: size }}
        />
      </motion.div>
    </button>
  );
}
