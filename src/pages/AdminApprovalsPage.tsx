import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingRow {
  session_id: string;
  parayanam_name: string | null;
  user_id: string;
  display_name: string | null;
  email: string | null;
  start_date: string | null;
  end_date: string | null;
  dashakams: number;
  requested_at: string;
}

const fmtDate = (ymd: string | null) =>
  ymd
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${ymd.slice(0, 10)}T00:00:00Z`),
      )
    : "";
const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(
    new Date(iso),
  );

/** Admin: own parayanams waiting for Guru's approval. */
export default function AdminApprovalsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<PendingRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await (supabase as any).rpc("get_pending_own_parayanams");
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data ?? []) as PendingRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (row: PendingRow, fn: "approve_own_parayanam" | "reject_own_parayanam") => {
    setBusyId(row.session_id);
    const { error: err } = await (supabase as any).rpc(fn, { p_session_id: row.session_id });
    setBusyId(null);
    if (err) {
      toast({ title: "Could not update", description: err.message, variant: "destructive" });
    } else {
      toast({ title: "Done." });
    }
    await load();
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 pb-24">
      <Link to="/admin/dashboard" className="inline-flex items-center gap-1.5 text-sm font-sans text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Founder Dashboard
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-foreground">Own parayanam approvals</h1>

      {loading ? (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="mt-6 text-sm font-sans text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm font-sans text-muted-foreground">No parayanams waiting.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.session_id} className="rounded-xl border border-border bg-card p-4">
              <p className="font-display text-base font-semibold text-foreground break-words">
                {r.parayanam_name || "Untitled parayanam"}
              </p>
              <p className="mt-1 text-sm font-sans text-foreground break-words">
                {r.display_name || "—"} <span className="text-muted-foreground">· {r.email || "—"}</span>
              </p>
              <p className="mt-1 text-xs font-sans text-muted-foreground">
                {fmtDate(r.start_date)}
                {r.end_date ? ` – ${fmtDate(r.end_date)}` : ""} · {r.dashakams} dashakams · requested {fmtWhen(r.requested_at)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" disabled={busyId === r.session_id} onClick={() => void act(r, "approve_own_parayanam")}>
                  {busyId === r.session_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" disabled={busyId === r.session_id} onClick={() => setRejecting(r)}>
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this parayanam?</AlertDialogTitle>
            <AlertDialogDescription>
              {rejecting?.parayanam_name || "This parayanam"} by {rejecting?.display_name || rejecting?.email || "this member"} will not be approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const r = rejecting;
                setRejecting(null);
                if (r) void act(r, "reject_own_parayanam");
              }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
