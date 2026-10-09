import { motion } from "framer-motion";
import { Clock, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/logo.png";
import SEO from "@/components/SEO";

export default function TrialExpiredPage() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <SEO path="/trial-expired" title="Your access has paused" description="Thank you for chanting with Sriman Narayaneeyam. If you think this is a mistake or would like to continue, please write to namaste@narayaneeyam.app." />
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
            Your access has paused
          </h1>
          <p className="text-sm text-muted-foreground font-sans mb-6">
            Thank you for chanting with Sriman Narayaneeyam. If you think this is a mistake or would like to continue, please write to namaste@narayaneeyam.app.
          </p>

          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="w-full font-sans"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
