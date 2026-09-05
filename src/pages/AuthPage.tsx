import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Lock, User, LogIn, UserPlus, KeyRound, RefreshCw, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@/assets/logo.png";
import SEO from "@/components/SEO";
import { useActiveLanguages } from "@/hooks/useActiveLanguages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Mode = "signin" | "signup" | "forgot";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [scriptLang, setScriptLang] = useState("");
  const [translationLang, setTranslationLang] = useState("");
  const languages = useActiveLanguages();
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Preserve the destination (e.g. a group invite) across the login round-trip.
  const nextParam = searchParams.get("next");
  const nextPath = nextParam && nextParam.startsWith("/") ? nextParam : "/";
  const { toast } = useToast();

  const handleResendConfirmation = async () => {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email sent", description: "Please check your inbox for the confirmation link." });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}${nextPath}` },
    });
    if (error) {
      toast({ title: "Google sign-in failed", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResend(false);

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
      const { error } = await signUp(email, password, name, {
        scriptLanguage: scriptLang || null,
        translationLanguage: translationLang || null,
      });
      if (error) {
        toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Account created!",
          description: "Please check your email and click the confirmation link to activate your account.",
        });
        setMode("signin");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message?.toLowerCase().includes("email not confirmed")) {
          setShowResend(true);
          toast({
            title: "Email not confirmed",
            description: "Please confirm your email first. Check your inbox for the confirmation link.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        }
      } else {
        navigate(nextPath, { replace: true });
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
      <SEO path="/auth" title="Sign In — Sriman Narayaneeyam" description="Sign in or create your account to track your Sriman Narayaneeyam chanting practice across devices." />
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

          {mode !== "forgot" && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex h-10 w-full items-center justify-center gap-3 rounded-md border border-[#dadce0] bg-white px-4 font-sans text-sm font-medium text-[#3c4043] transition hover:bg-[#f8f9fa] disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 3-2.26 5.54-4.78 7.25l7.73 6c4.51-4.18 7.09-10.36 7.09-17.72z" />
                  <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.6.28-3.15.77-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Continue with Google
              </button>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="font-sans text-xs uppercase text-muted-foreground">or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
              </div>
            )}
            {mode === "signup" && (
              <div className="grid gap-3 sm:grid-cols-2 items-end">
                <div className="space-y-1">
                  <label className="block min-h-[2rem] text-xs font-sans text-muted-foreground leading-tight">
                    Preferred language for lyrics
                  </label>
                  <Select value={scriptLang} onValueChange={setScriptLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="block min-h-[2rem] text-xs font-sans text-muted-foreground leading-tight">
                    Preferred language for translation
                  </label>
                  <Select value={translationLang} onValueChange={setTranslationLang}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose…" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
            </div>
            {mode !== "forgot" && (
              <PasswordInput
                leftIcon={<Lock className="h-4 w-4" />}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
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

          <p className="mt-4 text-center text-xs text-muted-foreground font-sans">
            By continuing, you agree to our{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>

          {showResend && mode === "signin" && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-center">
              <p className="text-xs text-foreground font-sans mb-2">
                Please confirm your email first. Check your inbox for the confirmation link.
              </p>
              <button
                onClick={handleResendConfirmation}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-sans font-semibold text-primary-foreground hover:opacity-90"
              >
                <RefreshCw className="h-3 w-3" /> Resend Confirmation Email
              </button>
            </div>
          )}

          <div className="mt-6 text-center space-y-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary hover:underline font-sans"
            >
              <Home className="h-4 w-4" /> Go to landing page
            </Link>
            {mode === "signin" && (
              <button onClick={() => setMode("forgot")} className="block w-full text-sm text-muted-foreground hover:text-primary hover:underline font-sans">
                Forgot your password?
              </button>
            )}
            <button
              onClick={() => { setMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin"); setShowResend(false); }}
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