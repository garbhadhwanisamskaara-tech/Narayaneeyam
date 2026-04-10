import { motion } from "framer-motion";
import { Clock, Mail, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";

export default function TrialExpiredPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card p-8 shadow-peacock text-center">
          <div className="mx-auto h-16 w-16 rounded-full overflow-hidden mb-6">
            <img src={logoImg} alt="Logo" className="h-full w-full object-cover" />
          </div>

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Clock className="h-8 w-8 text-destructive" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Your Trial Has Ended
          </h1>
          <p className="text-sm text-muted-foreground font-sans mb-6">
            Thank you for exploring Sriman Narayaneeyam. Your free trial period has concluded.
            To continue your devotional journey, please upgrade to a paid plan.
          </p>

          <div className="rounded-xl bg-gradient-peacock p-5 mb-6 text-center">
            <p className="font-display text-sm text-primary-foreground/80 mb-1">
              Unlock the full experience
            </p>
            <p className="text-xs text-gold-light font-sans">
              All 100 Dashakams · Chant & Learn modes · Podcast · Script Library
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="mailto:support@narayaneeyam.app?subject=Upgrade%20Request"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-peacock px-4 py-3 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Mail className="h-4 w-4" />
              Contact Us to Upgrade
            </a>

            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full font-sans"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
