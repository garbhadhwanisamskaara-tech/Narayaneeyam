import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CalendarDays, Loader2, Settings2, UserMinus, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { GroupMember } from "@/hooks/useGroups";
import {
  countIncompleteAssignments,
  inviteParticipants,
  removeParticipant,
  type Participant,
  type ParticipantStatus,
  type RemovalMode,
} from "@/hooks/useParayanamParticipants";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  groupId: string;
  sessionId: string;
  parayanamName: string | null;
  finalized: boolean;
  members: GroupMember[];
  ownerId: string;
  participants: Participant[];
  /** Called after any change so the page can refetch everything together. */
  onChanged: () => void | Promise<void>;
}

const STATUS_LABEL: Record<ParticipantStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
};

/** Owner-only actions scoped to a single parayanam (not the group). */
export default function ManageParayanamDialog({
  groupId,
  sessionId,
  parayanamName,
  finalized,
  members,
  ownerId,
  participants,
  onChanged,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [incomplete, setIncomplete] = useState(0);
  const [redistributeOpen, setRedistributeOpen] = useState(false);
  const [removalMode, setRemovalMode] = useState<RemovalMode>("distribute");
  const [assignTo, setAssignTo] = useState("");

  const statusById = useMemo(
    () => new Map(participants.map((p) => [p.user_id, p.status])),
    [participants]
  );

  const invitable = members.filter((m) => !statusById.has(m.user_id));
  const current = members.filter((m) => statusById.has(m.user_id));

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleInvite = async () => {
    if (!selected.length) return;
    setBusy(true);
    try {
      await inviteParticipants(sessionId, selected);
      toast({ title: "Invites sent", description: "They'll see the invite on their group page." });
      setSelected([]);
      await onChanged();
    } catch (e: any) {
      toast({ title: "Could not invite", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /** Confirmed participants who could take over someone else's dashakams. */
  const reassignCandidates = members.filter(
    (m) => statusById.get(m.user_id) === "confirmed" && m.user_id !== removeTarget?.userId
  );

  /** Ask about redistribution only when there is actually something to redistribute. */
  const startRemove = async (userId: string, name: string) => {
    setRemoveTarget({ userId, name });
    setRemovalMode("distribute");
    setAssignTo("");
    setIncomplete(0);
    setChecking(true);
    try {
      const { splitMode, incomplete: n } = await countIncompleteAssignments(sessionId, userId);
      if (splitMode && n > 0) {
        setIncomplete(n);
        setRedistributeOpen(true);
      }
    } catch {
      /* fall back to the plain confirmation */
    } finally {
      setChecking(false);
    }
  };

  const doRemove = async (mode: RemovalMode, targetUserId?: string | null) => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await removeParticipant(sessionId, removeTarget.userId, mode, targetUserId);
      toast({
        title: "Removed from this parayanam",
        description: `${removeTarget.name} is still a member of the group.`,
      });
      setRemoveTarget(null);
      setRedistributeOpen(false);
      await onChanged();
    } catch (e: any) {
      toast({ title: "Could not remove them", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = () => doRemove("distribute");

  const handleCancel = async () => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("challenge_sessions")
      .update({ technical_state: "CANCELLED", completed_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (!error) {
      await (supabase as any)
        .from("groups")
        .update({ active_challenge_session_id: null })
        .eq("id", groupId)
        .eq("active_challenge_session_id", sessionId);
    }
    setBusy(false);
    setCancelOpen(false);
    if (error) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Parayanam cancelled", description: "Everyone keeps their own chanting history." });
    setOpen(false);
    await onChanged();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
          >
            <Settings2 className="h-4 w-4" /> Manage Parayanam
          </button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">
              Manage “{parayanamName || "Parayanam"}”
            </DialogTitle>
            <DialogDescription className="font-sans text-sm">
              These actions affect this parayanam only — not the group itself.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 space-y-6">
            <div>
              <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
                <UserPlus className="h-4 w-4 text-primary" /> Invite more members
              </h3>
              {invitable.length === 0 ? (
                <p className="mt-2 font-sans text-xs text-muted-foreground">
                  Everyone in the group has already been invited to this parayanam.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-2">
                    {invitable.map((m) => (
                      <li key={m.user_id}>
                        <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selected.includes(m.user_id)}
                            onChange={() => toggle(m.user_id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="font-sans text-sm text-foreground">{m.display_name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => void handleInvite()}
                    disabled={busy || !selected.length}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Send invites
                  </button>
                </>
              )}
            </div>

            <div>
              <h3 className="font-sans text-sm font-semibold text-foreground">Participants</h3>
              {current.length === 0 ? (
                <p className="mt-2 font-sans text-xs text-muted-foreground">No one has been invited yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {current.map((m) => (
                    <li
                      key={m.user_id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                    >
                      <span className="font-sans text-sm text-foreground">
                        {m.display_name}
                        <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 font-sans text-[10px] uppercase tracking-wide text-secondary-foreground">
                          {STATUS_LABEL[statusById.get(m.user_id) as ParticipantStatus]}
                        </span>
                      </span>
                      {m.user_id !== ownerId && (
                        <button
                          onClick={() => void startRemove(m.user_id, m.display_name)}
                          disabled={busy || checking}
                          className="inline-flex items-center gap-1 rounded-lg border border-destructive/50 px-3 py-1.5 font-sans text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                        >
                          <UserMinus className="h-3.5 w-3.5" /> Remove from this parayanam
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="font-sans text-sm font-semibold text-foreground">Name & dates</h3>
              {finalized ? (
                <p className="mt-2 font-sans text-xs text-muted-foreground">
                  This parayanam has begun, so its name and dates can no longer be changed.
                </p>
              ) : (
                <Link
                  to={`/groups/${groupId}/schedule?session=${sessionId}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:border-primary"
                >
                  <CalendarDays className="h-4 w-4" /> Edit name, dates & dashakams
                </Link>
              )}
            </div>

            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              <h3 className="font-sans text-sm font-semibold text-destructive">Cancel this parayanam</h3>
              <p className="mt-1 font-sans text-xs text-muted-foreground">
                Stops this parayanam for everyone. The group and everyone's own chanting history stay intact.
              </p>
              <button
                onClick={() => setCancelOpen(true)}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <Ban className="h-4 w-4" /> Cancel parayanam
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!removeTarget && !redistributeOpen && !checking}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name} from this parayanam?</AlertDialogTitle>
            <AlertDialogDescription>
              They will no longer take part in “{parayanamName || "this parayanam"}”, and their assigned
              dashakams will be freed. They stay a member of the group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setRemoveTarget(null)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Keep them
            </button>
            <button
              onClick={() => void handleRemove()}
              disabled={busy}
              className="rounded-md bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {busy ? "Removing…" : "Remove from this parayanam"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Split-mode removal: decide where the unchanted dashakams should go. */}
      <AlertDialog
        open={redistributeOpen}
        onOpenChange={(o) => {
          if (!o) {
            setRedistributeOpen(false);
            setRemoveTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeTarget?.name} has {incomplete} incomplete {incomplete === 1 ? "dashakam" : "dashakams"} in this
              parayanam. What should happen to them?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose how these dashakams should be carried on once they leave “{parayanamName || "this parayanam"}”.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted">
              <input
                type="radio"
                name="removal-mode"
                className="mt-1"
                checked={removalMode === "distribute"}
                onChange={() => setRemovalMode("distribute")}
              />
              <span className="font-sans text-sm text-foreground">
                Distribute evenly among remaining participants
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted">
              <input
                type="radio"
                name="removal-mode"
                className="mt-1"
                checked={removalMode === "assign_to"}
                onChange={() => setRemovalMode("assign_to")}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-sans text-sm text-foreground">Assign all to one member</span>
                {removalMode === "assign_to" && (
                  <select
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-sans text-sm text-foreground"
                  >
                    <option value="">Choose a member…</option>
                    {reassignCandidates.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                )}
              </span>
            </label>
          </div>

          <AlertDialogFooter>
            <button
              onClick={() => {
                setRedistributeOpen(false);
                setRemoveTarget(null);
              }}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Keep them
            </button>
            <button
              onClick={() => void doRemove(removalMode, assignTo || null)}
              disabled={busy || (removalMode === "assign_to" && !assignTo)}
              className="rounded-md bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {busy ? "Removing…" : "Remove from this parayanam"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel “{parayanamName || "this parayanam"}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This stops the parayanam for everyone taking part. It cannot be restarted, though you can always
              add a new parayanam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <button
              onClick={() => setCancelOpen(false)}
              className="rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground hover:bg-muted"
            >
              Keep it running
            </button>
            <button
              onClick={() => void handleCancel()}
              disabled={busy}
              className="rounded-md bg-destructive px-4 py-2 font-sans text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {busy ? "Cancelling…" : "Cancel parayanam"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
