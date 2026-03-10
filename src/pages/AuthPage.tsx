import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";

type Mode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      if (!supabase) { setLoading(false); return; }
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Check your email", description: "We've sent you a password reset link." });
        setMode("signin");
      }
    } else if (mode === "signup") {
      const { error } = await signUp(email, password, name);
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account created!", description: "Please check your email to confirm your account, or sign in if email confirmation is disabled." });
        setMode("signin");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  const titles: Record<Mode, { heading: string; sub: string }> = {
    signin: { heading: "Welcome Back", sub: "Continue your devotional journey" },
    signup: { heading: "Create Account", sub: "Begin your devotional journey" },
    forgot: { heading: "Reset Password", sub: "We'll send you a reset link" },
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl border border-border bg-card p-8 shadow-peacock">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 rounded-full overflow-hidden mb-4">
              <img src={logoImg} alt="Logo" className="h-full w-full object-cover" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">{titles[mode].heading}</h1>
            <p className="text-sm text-muted-foreground font-sans mt-1">{titles[mode].sub}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required minLength={6} />
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-gradient-peacock text-primary-foreground font-sans font-semibold hover:opacity-90">
              {loading ? "Please wait…" : mode === "forgot" ? (
                <><KeyRound className="mr-2 h-4 w-4" /> Send Reset Link</>
              ) : mode === "signup" ? (
                <><UserPlus className="mr-2 h-4 w-4" /> Sign Up</>
              ) : (
                <><LogIn className="mr-2 h-4 w-4" /> Sign In</>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {mode === "signin" && (
              <button onClick={() => setMode("forgot")} className="block w-full text-sm text-muted-foreground hover:text-primary hover:underline font-sans">
                Forgot your password?
              </button>
            )}
            <button
              onClick={() => setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin")}
              className="text-sm text-primary hover:underline font-sans"
            >
              {mode === "signup" ? "Already have an account? Sign In" : mode === "signin" ? "Don't have an account? Sign Up" : "Back to Sign In"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
