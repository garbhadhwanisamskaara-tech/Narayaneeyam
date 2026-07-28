import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type MemberOption = { user_id: string; display_name: string; email: string | null };

interface GroupDangerZoneProps {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

const parseInvokeError = async (error: any) => {
  const ctx = error?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      return await ctx.json();
    } catch {
      return null;
    }
  }
  return null;
};

export default function GroupDangerZone({ groupId, groupName, isOwner }: GroupDangerZoneProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [dissolving, setDissolving] = useState(false);

  const loadMembers = async () => {
    setLoadingMembers(true);
    setMembers([]);
    setSelectedMemberId("");
    const { data: rows, error } = await (supabase as any)
      .from("group_members")
      .select("user_id, joined_at")
      .eq("group_id", groupId)
      .neq("user_id", user?.id ?? "")
      .is("left_at", null)
      .order("joined_at", { ascending: true });
    if (error) {
      setLoadingMembers(false);
      toast({ title: "Could not load members", description: error.message, variant: "destructive" });
      return;
    }
    const ids = (rows ?? []).map((r: any) => r.user_id);
    let profilesById = new Map<string, { display_name: string | null; email: string | null }>();
    if (ids.length > 0) {
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", ids);
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

  const callLeave = async (newOwnerId?: string) => {
    setLeaving(true);
    try {
      const body: Record<string, string> = { group_id: groupId };
      if (newOwnerId) body.new_owner_id = newOwnerId;
      const { error } = await supabase.functions.invoke("leave-group", { body });
      if (error) {
        const payload = await parseInvokeError(error);
        throw new Error(payload?.error || error.message);
      }
      toast({ title: "You have left the group", description: `You are no longer part of ${groupName}.` });
      setLeaveDialogOpen(false);
      setTransferOpen(false);
      navigate("/groups");
    } catch (e) {
      toast({
        title: "Could not leave group",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLeaving(false);
    }
  };

  const handleLeaveConfirm = async () => {
    if (!isOwner) {
      await callLeave();
      return;
    }
    // Owner: check whether anyone else is still active in the group.
    setLeaving(true);
    await loadMembers();
    setLeaving(false);
    const { count } = await (supabase as any)
      .from("group_members")
      .select("id", { count: "exact", head: true })
      .eq("group_id", groupId)
      .neq("user_id", user?.id ?? "")
      .is("left_at", null);
    if ((count ?? 0) > 0) {
      setLeaveDialogOpen(false);
      setTransferOpen(true);
      return;
    }
    await callLeave();
  };

  const handleTransferAndLeave = async () => {
    await callLeave(selectedMemberId || undefined);
  };

  const handleDissolve = async () => {
    if (confirmText !== "DISSOLVE") return;
    setDissolving(true);
    try {
      const { error } = await supabase.functions.invoke("dissolve-group", { body: { group_id: groupId } });
      if (error) {
        const payload = await parseInvokeError(error);
        throw new Error(payload?.error || error.message);
      }
      toast({ title: "Group dissolved", description: `${groupName} has been permanently dissolved.` });
      setDissolveOpen(false);
      navigate("/groups");
    } catch (e) {
      toast({
        title: "Could not dissolve group",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDissolving(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-destructive/40 bg-destructive/5 p-5">
      <div className="mb-1 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-destructive">Danger Zone</h2>
      </div>
      <p className="mb-3 font-sans text-xs text-destructive/80">
        These actions are permanent and cannot be undone. Please read carefully before proceeding.
      </p>

      <div className="mt-4">
        <p className="font-sans text-sm text-muted-foreground">
          Leaving this group keeps your own chanting history and feathers.
        </p>
        <button
          onClick={() => setLeaveDialogOpen(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive px-4 py-2.5 font-sans text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" /> Leave Group
        </button>
      </div>

      {isOwner && (
        <div className="mt-6 border-t border-destructive/30 pt-5">
          <p className="font-sans text-sm text-muted-foreground">
            Dissolving is permanent. All group parayanams will be cancelled and every member becomes an independent
            user, keeping their own individual chanting history and feathers.
          </p>
          <button
            onClick={() => {
              setConfirmText("");
              setDissolveOpen(true);
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 font-sans text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            <Trash2 className="h-4 w-4" /> Dissolve Group
          </button>
        </div>
      )}

      {/* Leave confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave “{groupName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer see this group's parayanams. Your own chanting history and feathers stay with you.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setLeaveDialogOpen(false)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleLeaveConfirm}
              disabled={leaving}
              className="rounded-md bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {leaving ? "Leaving…" : "Leave Group"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer ownership before leaving */}
      <AlertDialog
        open={transferOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTransferOpen(false);
            setMembers([]);
            setSelectedMemberId("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Group Ownership</AlertDialogTitle>
            <AlertDialogDescription>
              You own “{groupName}”, which still has other members. Please pass ownership to a member before you leave.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {loadingMembers ? (
            <p className="font-sans text-sm text-muted-foreground">Loading members…</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {members.map((m) => (
                <label
                  key={m.user_id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                >
                  <input
                    type="radio"
                    name="leave-new-owner"
                    className="mt-1"
                    value={m.user_id}
                    checked={selectedMemberId === m.user_id}
                    onChange={() => setSelectedMemberId(m.user_id)}
                  />
                  <span className="min-w-0">
                    <span className="block font-sans text-sm text-foreground">{m.display_name}</span>
                    <span className="block break-all font-sans text-xs text-muted-foreground">
                      {m.email ?? "email not available"}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          {members.length > 0 && (
            <p className="font-sans text-xs text-muted-foreground">
              If you don't choose, we'll transfer ownership to {members[0].display_name}, who has been in this group the
              longest.
            </p>
          )}

          <AlertDialogFooter>
            <button
              onClick={() => {
                setTransferOpen(false);
                setMembers([]);
                setSelectedMemberId("");
              }}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleTransferAndLeave}
              disabled={leaving || loadingMembers || members.length === 0}
              className="rounded-md bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {leaving ? "Transferring…" : "Transfer & Continue"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dissolve confirmation */}
      <AlertDialog open={dissolveOpen} onOpenChange={setDissolveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dissolve “{groupName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This is permanent. All group parayanams will be cancelled and every member becomes an independent user.
              Each person keeps their own individual chanting history and feathers.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div>
            <label className="font-sans text-sm text-foreground">
              Type <span className="font-semibold">DISSOLVE</span> to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DISSOLVE"
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground"
            />
          </div>

          <AlertDialogFooter>
            <button
              onClick={() => setDissolveOpen(false)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleDissolve}
              disabled={confirmText !== "DISSOLVE" || dissolving}
              className="rounded-md bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {dissolving ? "Dissolving…" : "Dissolve Permanently"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
