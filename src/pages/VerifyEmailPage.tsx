import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

export default function VerifyEmailPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    if (!user?.email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Please check your inbox for the confirmation link." });
    }
    setLoading(false);
  };

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

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Mail className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-2">
            Please Verify Your Email
          </h1>
          <p className="text-sm text-muted-foreground font-sans mb-2">
            We've sent a confirmation link to:
          </p>
          <p className="text-sm font-semibold text-foreground font-sans mb-6">
            {user?.email || "your email address"}
          </p>
          <p className="text-xs text-muted-foreground font-sans mb-8">
            Please click the link in your email to verify your account. Once verified, you'll have full access to your devotional journey.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleResend}
              disabled={loading}
              className="w-full bg-gradient-peacock text-primary-foreground font-sans font-semibold hover:opacity-90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loading ? "Sending…" : "Resend Confirmation Email"}
            </Button>

            <button
              onClick={() => signOut()}
              className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2.5 text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out and use a different email
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
