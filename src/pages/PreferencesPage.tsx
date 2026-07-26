import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, Type } from "lucide-react";
import { FONT_SIZES, usePreferences } from "@/contexts/PreferencesContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
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
  const { signOut } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
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
        <meta name="description" content="Adjust text size and manage your Sriman Narayaneeyam account preferences." />
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
        <AlertDialog>
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
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes your account and all your data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Yes, delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
