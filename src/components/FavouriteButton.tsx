import { Heart } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  active: boolean;
  onClick: () => void;
  size?: number;
}

export default function FavouriteButton({ active, onClick, size = 18 }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={active ? "Remove from favourites" : "Add to favourites"}
      className="relative p-1 transition-colors"
    >
      <motion.div
        animate={active ? { scale: [1, 1.35, 0.95, 1.1, 1] } : { scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Heart
          className={`transition-all duration-300 ${
            active
              ? "fill-favourite-rose text-favourite-rose"
              : "fill-none text-muted-foreground hover:text-favourite-rose"
          }`}
          style={{ width: size, height: size }}
        />
      </motion.div>
    </button>
  );
}
