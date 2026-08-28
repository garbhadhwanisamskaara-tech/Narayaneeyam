import { useState } from "react";
import { Link } from "react-router-dom";
import { FileEdit, Loader2, Trash2 } from "lucide-react";
import { useParayanamDrafts } from "@/hooks/useParayanamDrafts";
import { toast } from "@/hooks/use-toast";

type Props = {
  /** Undefined for personal drafts. */
  groupId?: string;
  /** Only the Guru/owner ever sees drafts. */
  enabled?: boolean;
};

export default function ParayanamDraftsList({ groupId, enabled = true }: Props) {
  const { drafts, loading, discardDraft } = useParayanamDrafts(groupId, enabled);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!enabled) return null;
  if (loading) return null;
  if (!drafts.length) return null;

  const handleDiscard = async (id: string) => {
    setBusyId(id);
    try {
      await discardDraft(id);
      toast({ title: "Draft discarded" });
    } catch (e: any) {
      toast({ title: "Could not discard the draft", description: e?.message, variant: "destructive" });
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <h2 className="font-display text-lg font-semibold text-foreground">Drafts</h2>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Only you can see these. Nothing has been sent out yet.
      </p>
      <ul className="mt-4 space-y-3">
        {drafts.map((d) => (
          <li key={d.id} className="rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-sans text-sm font-semibold text-foreground">
                  {d.parayanam_name?.trim() || "Untitled Parayanam"}
                </p>
                <p className="mt-1 flex items-center gap-2">
                  <span className="rounded-full border border-border px-2 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Draft
                  </span>
                  <span className="font-sans text-xs text-muted-foreground">Setup incomplete</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/parayanam/new?${groupId ? `group=${groupId}&` : ""}draft=${d.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-3 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <FileEdit className="h-4 w-4" /> Continue Setup
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmId(confirmId === d.id ? null : d.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 font-sans text-sm font-semibold text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" /> Discard
                </button>
              </div>
            </div>

            {confirmId === d.id && (
              <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                <p className="font-sans text-sm text-foreground">
                  Discard this draft Parayanam? This cannot be undone.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void handleDiscard(d.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 font-sans text-sm font-semibold text-destructive-foreground disabled:opacity-50"
                  >
                    {busyId === d.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Discard draft
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="rounded-lg border border-border px-3 py-2 font-sans text-sm font-semibold text-foreground"
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
