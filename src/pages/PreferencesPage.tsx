import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, KeyRound, Type } from "lucide-react";
import { FONT_SIZES, usePreferences } from "@/contexts/PreferencesContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import LanguagePreferences from "@/components/LanguagePreferences";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PreferencesPage() {
  const { fontSize, setFontSize } = usePreferences();
  const { signOut, user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast({ title: "Current password required", description: "Please enter your existing password.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Please use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Please re-enter the same password.", variant: "destructive" });
      return;
    }
    if (!user?.email) {
      toast({ title: "Not available", description: "Password change needs an email-based account.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    // Verify the existing password before allowing a change.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      setSavingPassword(false);
      toast({ title: "Current password is incorrect", description: "Please try again.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast({ title: "Could not change password", description: error.message, variant: "destructive" });
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated", description: "Your new password is now active." });
    }
  };


  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: "Account removed", description: "Your account and data have been permanently removed." });
      await signOut();
    } catch (e) {
      toast({
        title: "Could not remove account",
        description: e instanceof Error ? e.message : "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Helmet>
        <title>My Preferences — Sriman Narayaneeyam</title>
        <meta name="description" content="Adjust text size, languages and manage your Sriman Narayaneeyam account preferences." />
      </Helmet>

      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">My Preferences</h1>

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold text-foreground">Text Size</h2>
        </div>
        <p className="text-xs text-muted-foreground font-sans mb-4">
          Medium is the default. Changes apply immediately across the app.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={`rounded-lg px-3 py-2 text-sm font-sans transition-colors border ${
                fontSize === f.value
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <LanguagePreferences />

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold text-foreground">Change Password</h2>
        </div>
        <p className="text-xs text-muted-foreground font-sans mb-4">
          Choose a new password of at least 6 characters.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="submit"
            disabled={savingPassword}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {savingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-destructive">Danger Zone</h2>
        </div>
        <p className="text-xs text-destructive/80 font-sans mb-3">
          This action is permanent and cannot be undone. Please read carefully before proceeding.
        </p>
        <p className="text-xs text-muted-foreground font-sans mb-4">
          Removing your account will sign you out and permanently remove your personal data, progress and saved places.
        </p>
        <AlertDialog onOpenChange={(open) => { if (!open) setConfirmText(""); }}>
          <AlertDialogTrigger asChild>
            <button
              disabled={deleting}
              className="w-full rounded-lg border border-destructive px-4 py-2.5 text-sm font-sans font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
            >
              {deleting ? "Removing…" : "Delete My Account"}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete My Account</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove your account and personal data immediately. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <label htmlFor="delete-confirm" className="text-xs font-sans text-foreground">
                Type DELETE to confirm
              </label>
              <Input
                id="delete-confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-sans font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Permanently Delete
              </button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
