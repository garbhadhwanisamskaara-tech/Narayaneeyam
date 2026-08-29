import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, MailQuestion, RotateCcw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type InviteStatus = "invited" | "confirmed" | "declined";
type ContributionStatus = "not_required" | "pending" | "confirmed";
type AccessStatus = "active" | "locked";

interface Row {
  id: string;
  user_id: string;
  status: InviteStatus;
  contribution_status: ContributionStatus | null;
  access_status: AccessStatus | null;
  name: string;
}

const INVITE_LABEL: Record<InviteStatus, string> = {
  invited: "Invited",
  confirmed: "Confirmed",
  declined: "Declined",
};

const CONTRIBUTION_LABEL: Record<ContributionStatus, string> = {
  not_required: "Not required",
  pending: "Pending",
  confirmed: "Confirmed",
};

function accessLabel(r: Row): string {
  if (r.access_status === "active") return "Ready to participate";
  if (r.status === "confirmed") return "Awaiting confirmation";
  return "Not yet joined";
}

interface Props {
  sessionId: string | null;
  /** Only the Guru who owns the parayanam sees the confirm actions. */
  isOwner: boolean;
}

/** The Guru's view of everyone invited to one parayanam. */
export default function ParayanamParticipantManager({ sessionId, isOwner }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const load = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: session }, { data: parts }] = await Promise.all([
      (supabase as any).from("challenge_sessions").select("participation_type").eq("id", sessionId).maybeSingle(),
      (supabase as any)
        .from("parayanam_participants")
        .select("id, user_id, status, contribution_status, access_status")
        .eq("challenge_session_id", sessionId),
    ]);

    setPaid(session?.participation_type === "PAID");

    const list = (parts ?? []) as Omit<Row, "name">[];
    let nameById = new Map<string, string>();
    if (list.length) {
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in(
          "id",
          list.map((p) => p.user_id),
        );
      nameById = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p.display_name ?? p.email ?? "Member"]));
    }

    setRows(
      list
        .map((p) => ({
          ...p,
          name: nameById.get(p.user_id) ?? "Member",
        }))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            sensitivity: "base",
          }),
        ),
    );
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    setPendingOpen(false);
    setMembersOpen(false);
    void load();
  }, [load]);

  const setContribution = async (id: string, next: "confirmed" | "pending") => {
    setError(null);
    setBusyId(id);
    // access_status is derived server-side — never written from here.
    const { error: err } = await (supabase as any)
      .from("parayanam_participants")
      .update({ contribution_status: next })
      .eq("id", id);
    setBusyId(null);
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  };

  if (!sessionId) return null;
  if (loading) return <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" />;
  if (!rows.length) return null;

  const pendingInvitees = rows.filter((r) => r.status === "invited");
  const others = rows.filter((r) => r.status !== "invited" && r.status !== "declined");

  const renderRow = (r: Row) => {
    const contribution = (r.contribution_status ?? "not_required") as ContributionStatus;
    const canConfirm = isOwner && paid && r.status === "confirmed" && contribution === "pending";
    const canRevert = isOwner && paid && contribution === "confirmed";

    return (
      <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
        <div className="min-w-0">
          <p className="truncate font-sans text-sm font-semibold text-foreground">{r.name}</p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 font-sans text-xs text-muted-foreground">
            <span>{INVITE_LABEL[r.status]}</span>
            {paid && r.status !== "declined" && <span>Contribution: {CONTRIBUTION_LABEL[contribution]}</span>}
            <span>{accessLabel(r)}</span>
          </p>
        </div>
        {(canConfirm || canRevert) && (
          <div className="flex gap-2">
            {canConfirm && (
              <button
                onClick={() => void setContribution(r.id, "confirmed")}
                disabled={busyId === r.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-peacock px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {busyId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                Approve for Parayanam
              </button>
            )}
            {canRevert && (
              <button
                onClick={() => void setContribution(r.id, "pending")}
                disabled={busyId === r.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Awaiting Approval
              </button>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="mt-5 space-y-5">
      {pendingInvitees.length > 0 && (
        <div className="rounded-2xl border border-primary/40 bg-primary/5">
          <button
            type="button"
            onClick={() => setPendingOpen((v) => !v)}
            aria-expanded={pendingOpen}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <MailQuestion className="h-4 w-4 text-primary" />
              Waiting to answer their invitation ({pendingInvitees.length})
            </span>

            {pendingOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {pendingOpen && (
            <div className="border-t border-primary/20 px-4 pb-4">
              <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-2">{pendingInvitees.map(renderRow)}</ul>
            </div>
          )}
        </div>
      )}
      {others.length > 0 && (
        <div className="rounded-2xl border border-border">
          <button
            type="button"
            onClick={() => setMembersOpen((v) => !v)}
            aria-expanded={membersOpen}
            className="flex w-full items-center justify-between gap-3 p-4 text-left"
          >
            <span className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              Members ({others.length})
            </span>

            {membersOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>

          {membersOpen && (
            <div className="border-t border-border px-4 pb-4">
              <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-2">{others.map(renderRow)}</ul>
            </div>
          )}
        </div>
      )}

      {error && <p className="font-sans text-sm text-destructive">{error}</p>}
    </div>
  );
}
