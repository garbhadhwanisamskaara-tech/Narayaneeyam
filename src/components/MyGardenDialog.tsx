import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, History } from "lucide-react";
import { useMyGardenSessions } from "@/hooks/useMyGardenSessions";
import { useSessionGarden } from "@/hooks/useSessionGarden";
import DashakamGarden from "@/components/DashakamGarden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Floating "My Dashakam Garden" dialog — lets the user tap lotuses for any
 * active group parayanam they're confirmed in without leaving the page
 * they're on. Unlike the shared group garden, this view renders only the
 * user's own bloom state per dashakam: bud or full bloom, 0/1 or 1/1.
 *
 * A "View past gardens" link switches to completed group parayanams, shown
 * read-only: the final bloom state exactly as it stood, with no
 * tap-to-complete interaction at all.
 */
export default function MyGardenDialog({ open, onOpenChange }: Props) {
  const { sessions, loading: sessionsLoading } = useMyGardenSessions();
  const { sessions: pastSessions, loading: pastLoading } = useMyGardenSessions({ view: "completed" });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [viewingPast, setViewingPast] = useState(false);

  // Fresh picker state each time the dialog opens.
  useEffect(() => {
    if (!open) {
      setSelectedSessionId(null);
      setViewingPast(false);
    }
  }, [open]);

  // A single active parayanam skips the picker entirely (past view always
  // shows its own list, even with one entry, so the way back stays visible).
  useEffect(() => {
    if (open && !viewingPast && sessions.length === 1) setSelectedSessionId(sessions[0].id);
  }, [open, viewingPast, sessions]);

  const { tiles, blooms, occurrences, loading, pending, toggleDashakam } =
    useSessionGarden(selectedSessionId);

  // Personal view on top of the shared garden data: a dashakam is fully
  // bloomed once I completed it, otherwise it's a bud — other members'
  // progress stays out of this view entirely. canTap is untouched, so the
  // start-date gate and assignment rules still apply exactly as before.
  const myBlooms = useMemo(() => {
    const m = new Map<string, number>();
    for (const [key, t] of tiles) m.set(key, t.mineDone > 0 ? 100 : 0);
    return m;
  }, [tiles]);

  const myTiles = useMemo(() => {
    const m = new Map<string, { done: number; total: number; canTap: boolean; scheduled_date?: string | null }>();
    for (const [key, t] of tiles) m.set(key, { done: t.mineDone > 0 ? 1 : 0, total: 1, canTap: t.canTap, scheduled_date: t.scheduled_date });
    return m;
  }, [tiles]);

  const activeList = viewingPast ? pastSessions : sessions;
  const selectedSession = activeList.find((s) => s.id === selectedSessionId);
  const picking = selectedSessionId === null && (viewingPast || activeList.length > 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {picking ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-semibold">
                {viewingPast ? "Past gardens" : "Which parayanam?"}
              </DialogTitle>
              <DialogDescription className="font-sans text-sm">
                {viewingPast
                  ? "Look back at the final bloom of a completed parayanam."
                  : "Choose the parayanam whose garden you'd like to update."}
              </DialogDescription>
            </DialogHeader>
            {viewingPast && (
              <button
                type="button"
                onClick={() => setViewingPast(false)}
                className="inline-flex items-center gap-1 self-start font-sans text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back to active parayanams
              </button>
            )}
            <div className="mt-2 space-y-2">
              {activeList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSessionId(s.id)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-left font-sans text-sm font-semibold text-foreground transition-colors hover:border-primary"
                >
                  {s.label}
                </button>
              ))}
              {viewingPast && !pastLoading && pastSessions.length === 0 && (
                <p className="py-4 text-center font-sans text-sm text-muted-foreground">
                  No completed parayanams yet — your finished gardens will appear here.
                </p>
              )}
            </div>
            {!viewingPast && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSessionId(null);
                  setViewingPast(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 self-center font-sans text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                <History className="h-3.5 w-3.5" /> View past gardens
              </button>
            )}
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">My Dashakam Garden</DialogTitle>
              <div className="flex items-center gap-3">
                {(viewingPast || sessions.length > 1) && (
                  <button
                    type="button"
                    onClick={() => setSelectedSessionId(null)}
                    className="inline-flex items-center gap-1 self-start font-sans text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> {viewingPast ? "Past gardens" : "Switch parayanam"}
                  </button>
                )}
              </div>
            </DialogHeader>
            {viewingPast ? (
              <DashakamGarden
                blooms={blooms}
                occurrences={occurrences}
                loading={loading}
                title={selectedSession?.label ?? "Past garden"}
                subtitle="Completed parayanam — read-only"
              />
            ) : sessionsLoading ? null : (
              <>
                <DashakamGarden
                  blooms={myBlooms}
                  tiles={myTiles}
                  occurrences={occurrences}
                  onTapDashakam={toggleDashakam}
                  pendingDashakam={pending}
                  loading={loading}
                  title={selectedSession?.label ?? "My Dashakam Garden"}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSessionId(null);
                    setViewingPast(true);
                  }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 font-sans text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  <History className="h-3.5 w-3.5" /> View past gardens
                </button>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
