import { Link } from "react-router-dom";
import { User, Route, UtensilsCrossed, Info, BookOpenCheck, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: "/dashboard", label: "Profile", icon: User },
  { path: "/devotion-pathways", label: "Devotion Pathways", icon: Route },
  { path: "/prasadam", label: "Prasadam List", icon: UtensilsCrossed },
  { path: "/about", label: "About", icon: Info },
  { path: "/user-manual", label: "User Manual", icon: BookOpenCheck },
];

export default function MoreMenu({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40"
            onClick={onClose}
          />
          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-card border-t border-border shadow-lg"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="font-display text-base font-semibold text-foreground">More</h3>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 pb-6 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-sans text-foreground hover:bg-muted/60 transition-colors"
                >
                  <item.icon className="h-5 w-5 text-muted-foreground" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
