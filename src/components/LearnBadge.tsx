import { useState, useRef, useEffect } from "react";
import { Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface LearnBadgeProps {
  children: React.ReactNode;
}

export function LearnBadge({ children }: LearnBadgeProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("touchstart", handlePointer);

    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("touchstart", handlePointer);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative flex flex-col gap-1 justify-end"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Learning tip"
        className="inline-flex items-center gap-1.5 rounded-full border border-gold-dark bg-gold-dark px-2.5 py-1.5 text-xs font-sans font-medium text-gold-light transition-colors hover:bg-gold-dark/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark/50"
        style={{
          boxShadow: "0 0 10px -2px hsl(42 70% 40% / 0.45), 0 0 18px -6px hsl(42 70% 40% / 0.25)",
        }}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        <span>Learn</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-gold/30 bg-card p-3 shadow-gold"
          >
            <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-l border-t border-gold/30 bg-card" />
            <p className="relative z-10 text-sm font-sans leading-relaxed text-foreground">
              {children}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
