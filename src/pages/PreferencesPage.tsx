import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { AlertTriangle, KeyRound, Type } from "lucide-react";
import { FONT_SIZES, usePreferences } from "@/contexts/PreferencesContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/PasswordInput";
import LanguagePreferences from "@/components/LanguagePreferences";
import ReminderSettings from "@/components/ReminderSettings";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [transferGroup, setTransferGroup] = useState<{ id: string; group_name: string } | null>(null);
  const [members, setMembers] = useState<{ user_id: string; display_name: string; email: string | null }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast({
        title: "Current password required",
        description: "Please enter your existing password.",
        variant: "destructive",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Please use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please re-enter the same password.",
        variant: "destructive",
      });
      return;
    }
    if (!user?.email) {
      toast({
        title: "Not available",
        description: "Password change needs an email-based account.",
        variant: "destructive",
      });
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

  type TransferGroup = { id: string; group_name: string };
  type TransferMember = { user_id: string; display_name: string; email: string | null };

  const parseInvokeError = async (error: unknown): Promise<any> => {
    const ctx = (error as any)?.context;
    if (ctx && typeof ctx.json === "function") {
      try {
        return await ctx.json();
      } catch {
        return null;
      }
    }
    return null;
  };

  const loadMembers = async (groupId: string) => {
    setLoadingMembers(true);
    setMembers([]);
    setSelectedMemberId("");
    const { data: rows, error } = await supabase
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .neq("user_id", user?.id ?? "")
      .order("joined_at", { ascending: true });
    if (error) {
      setLoadingMembers(false);
      toast({ title: "Could not load members", description: error.message, variant: "destructive" });
      return;
    }
    const ids = (rows ?? []).map((r: any) => r.user_id);
    let profilesById = new Map<string, { display_name: string | null; email: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, email").in("id", ids);
      profilesById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    }
    setMembers(
      (rows ?? []).map((r: any) => ({
        user_id: r.user_id,
        display_name: profilesById.get(r.user_id)?.display_name || "Unnamed member",
        email: profilesById.get(r.user_id)?.email ?? null,
      })),
    );
    setLoadingMembers(false);
  };

  const attemptDelete = async (): Promise<void> => {
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) {
        const payload = await parseInvokeError(error);
        if (
          payload?.error === "OWNERSHIP_TRANSFER_REQUIRED" &&
          Array.isArray(payload.groups) &&
          payload.groups.length > 0
        ) {
          const nextGroup: TransferGroup = payload.groups[0];
          setDeleteDialogOpen(false);
          setTransferGroup(nextGroup);
          setDeleting(false);
          await loadMembers(nextGroup.id);
          return;
        }
        throw new Error(payload?.error || error.message);
      }
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

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    await attemptDelete();
  };

  const handleTransfer = async () => {
    if (!transferGroup) return;
    setTransferring(true);
    try {
      const body: Record<string, string> = { group_id: transferGroup.id };
      if (selectedMemberId) body.new_owner_id = selectedMemberId;
      const { error } = await supabase.functions.invoke("transfer-group-ownership", { body });
      if (error) {
        const payload = await parseInvokeError(error);
        throw new Error(payload?.error || error.message);
      }
      setTransferring(false);
      setTransferGroup(null);
      setMembers([]);
      setSelectedMemberId("");
      await attemptDelete();
    } catch (e) {
      setTransferring(false);
      toast({
        title: "Could not transfer ownership",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelTransfer = () => {
    setTransferGroup(null);
    setMembers([]);
    setSelectedMemberId("");
    setDeleting(false);
    setConfirmText("");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Helmet>
        <title>My Preferences — Sriman Narayaneeyam</title>
        <meta
          name="description"
          content="Adjust text size, languages and manage your Sriman Narayaneeyam account preferences."
        />
      </Helmet>

      <h1 className="font-display text-2xl font-semibold text-foreground mb-6">My Preferences</h1>

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold text-foreground" style={{ fontSize: "16px" }}>
            Accessibility
          </h2>
        </div>
        <p className="font-sans text-muted-foreground mb-4" style={{ fontSize: "12px" }}>
          Text Size — Medium is the default. Changes apply immediately across the app.
        </p>
        <div role="radiogroup" aria-label="Text size" className="flex flex-wrap gap-2 sm:gap-3">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              type="button"
              role="radio"
              aria-checked={fontSize === f.value}
              onClick={() => setFontSize(f.value)}
              style={{ fontSize: "14px" }}
              className={`flex-1 basis-[calc(50%-0.25rem)] sm:basis-0 min-h-11 min-w-11 rounded-lg px-3 py-2 font-sans leading-tight transition-colors border ${
                fontSize === f.value
                  ? "bg-primary text-primary-foreground border-primary font-semibold"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-foreground font-body overflow-wrap-anywhere">The quick brown fox chants beautifully.</p>
      </section>

      <LanguagePreferences />

      <ReminderSettings />

      <section className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-base font-semibold text-foreground">Change Password</h2>
        </div>
        <p className="text-xs text-muted-foreground font-sans mb-4">
          Enter your current password, then choose a new one of at least 6 characters.
        </p>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <PasswordInput
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            required
          />
          <PasswordInput
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
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setConfirmText("");
          }}
        >
          <AlertDialogTrigger asChild>
            <button
              onClick={() => setDeleteDialogOpen(true)}
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
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
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

      <AlertDialog
        open={!!transferGroup}
        onOpenChange={(open) => {
          if (!open) cancelTransfer();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Group Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              You own “{transferGroup?.group_name}”, which still has other members. Please pass ownership to a member
              before your account is removed.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {loadingMembers ? (
            <p className="text-sm text-muted-foreground font-sans">Loading members…</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...members]
                .sort((a, b) =>
                  a.display_name.localeCompare(b.display_name, undefined, {
                    sensitivity: "base",
                  }),
                )
                .map((m) => (
                  <label
                    key={m.user_id}
                    className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="radio"
                      name="new-owner"
                      className="mt-1"
                      value={m.user_id}
                      checked={selectedMemberId === m.user_id}
                      onChange={() => setSelectedMemberId(m.user_id)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-sans text-foreground">{m.display_name}</span>
                      <span className="block text-xs font-sans text-muted-foreground break-all">
                        {m.email ?? "email not available"}
                      </span>
                    </span>
                  </label>
                ))}
            </div>
          )}

          {members.length > 0 && (
            <p className="text-xs font-sans text-muted-foreground">
              If you don't choose, we'll transfer ownership to {members[0].display_name}, who has been in this group the
              longest.
            </p>
          )}

          <AlertDialogFooter>
            <button
              onClick={cancelTransfer}
              className="rounded-md border border-border px-4 py-2 text-sm font-sans font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferring || loadingMembers || members.length === 0}
              className="rounded-md bg-primary px-4 py-2 text-sm font-sans font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {transferring ? "Transferring…" : "Transfer & Continue"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
