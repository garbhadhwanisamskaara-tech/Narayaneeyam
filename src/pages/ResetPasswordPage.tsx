import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setValid(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      navigate("/auth");
    }
    setLoading(false);
  };

  if (!valid) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center text-muted-foreground">
          <p>Invalid or expired reset link.</p>
          <button onClick={() => navigate("/auth")} className="mt-4 text-primary hover:underline text-sm font-sans">
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-peacock">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-full overflow-hidden mb-4">
              <img src={logoImg} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Set New Password</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">Choose a strong password for your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="pl-10" required minLength={6} />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-peacock text-primary-foreground font-sans font-semibold hover:opacity-90">
              {loading ? "Please wait…" : "Update Password"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
