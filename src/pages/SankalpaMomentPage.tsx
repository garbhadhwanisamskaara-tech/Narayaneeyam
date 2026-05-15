import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const MODE_LABELS: Record<string, string> = {
  saptaah: "Narayaneeyam Saptaah",
  "21_day": "21-Day Parayanam",
  "100_day": "100-Day Parayanam",
  daily: "Daily Parayanam",
};

interface SankalpaState {
  session_id?: string;
  mode?: string;
  start_date?: string;
}

export default function SankalpaMomentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as SankalpaState;
  const { session_id, mode, start_date } = state;

  useEffect(() => {
    if (!session_id || !mode) {
      navigate("/progress", { replace: true });
      return;
    }

    const today = new Date();
    const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (start_date === localToday) {
      (supabase as any)
        .from("challenge_sessions")
        .update({ spiritual_state: "in_progress" })
        .eq("id", session_id)
        .then(() => {});
    }
  }, [session_id, mode, start_date, navigate]);

  if (!session_id || !mode) return null;

  const modeLabel = MODE_LABELS[mode] ?? "Parayanam";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-8"
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="text-7xl md:text-8xl"
          aria-hidden
        >
          🪔
        </motion.div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7 }}
        className="font-display text-3xl md:text-4xl font-semibold text-secondary mb-4"
      >
        {modeLabel}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="font-sans text-base md:text-lg text-muted-foreground max-w-md mb-12"
      >
        May this offering be received.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        onClick={() => navigate("/progress", { replace: true })}
        className="rounded-full bg-gradient-gold px-8 py-3 font-display text-base font-semibold text-primary shadow-gold transition-transform hover:scale-105"
      >
        Take my sankalpa
      </motion.button>
    </div>
  );
}
