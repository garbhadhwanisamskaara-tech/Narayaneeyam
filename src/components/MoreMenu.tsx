import React from "react";
import { Link } from "react-router-dom";
import { FileText, Bookmark, Heart, HelpCircle, BookOpen, Settings, Sparkles, Flower2, Route, Footprints, X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { canOpenPath } from "@/components/RequireAccess";

interface Props {
  open: boolean;
  onClose: () => void;
}

const menuItems = [
  { path: "/script", label: "Script Library", icon: FileText },
  { path: "/journeys", label: "Guided Journeys", icon: Footprints },
  { path: "/festivals", label: "Festival Parayanams", icon: Sparkles },
  { path: "/prasadam", label: "Prasadam Guide", icon: Flower2 },
  { path: "/devotion-pathways", label: "Devotion Pathways", icon: Route },
  { path: "/shlokas", label: "Shlokas", icon: BookOpen },
  { path: "/saved-places", label: "Bookmarks", icon: Bookmark },
  { path: "/heart-shelf", label: "Favourites", icon: Heart },
  { path: "/faq", label: "FAQ", icon: HelpCircle },
  { path: "/blog", label: "Blog", icon: BookOpen },
  { path: "/user-guide", label: "Help & Settings", icon: Settings },
];

export default function MoreMenu({ open, onClose }: Props) {
  const { isMember, progressAccess, memberOnlyPaths } = useAuth();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl bg-card border-t border-border shadow-lg"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="font-display text-base font-semibold text-foreground">More</h3>
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="px-3 pb-2 space-y-1">
              {menuItems.map((item) =>
                canOpenPath(item.path, { isMember, progressAccess, memberOnlyPaths }) ? (
                  <Link key={item.path} to={item.path} onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-sans text-foreground hover:bg-muted/60 transition-colors">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    {item.label}
                  </Link>
                ) : (
                  <div key={item.path} aria-disabled="true"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-sans text-foreground opacity-50 cursor-not-allowed select-none">
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1">{item.label}</span>
                    <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </div>
                ),
              )}
            </nav>
            <div className="pb-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
