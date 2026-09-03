import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
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
 * parayanam they can bloom in (personal or group) without leaving the page
 * they're on. Unlike the shared group garden, this view renders only the
 * user's own bloom state per dashakam: bud or full bloom, 0/1 or 1/1.
 */
export default function MyGardenDialog({ open, onOpenChange }: Props) {
  const { sessions, loading: sessionsLoading } = useMyGardenSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fresh picker state each time the dialog opens.
  useEffect(() => {
    if (!open) setSelectedSessionId(null);
  }, [open]);

  // A single parayanam skips the picker entirely.
  useEffect(() => {
    if (open && sessions.length === 1) setSelectedSessionId(sessions[0].id);
  }, [open, sessions]);

  const { tiles, dashakamNumbers, loading, pending, toggleDashakam } =
    useSessionGarden(selectedSessionId);

  // Personal view on top of the shared garden data: a dashakam is fully
  // bloomed once I completed it, otherwise it's a bud — other members'
  // progress stays out of this view entirely. canTap is untouched, so the
  // start-date gate and assignment rules still apply exactly as before.
  const myBlooms = useMemo(() => {
    const m = new Map<number, number>();
    for (const [no, t] of tiles) m.set(no, t.mineDone > 0 ? 100 : 0);
    return m;
  }, [tiles]);

  const myTiles = useMemo(() => {
    const m = new Map<number, { done: number; total: number; canTap: boolean }>();
    for (const [no, t] of tiles) m.set(no, { done: t.mineDone > 0 ? 1 : 0, total: 1, canTap: t.canTap });
    return m;
  }, [tiles]);

  const picking = sessions.length > 1 && selectedSessionId === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        {picking ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-semibold">
                Which parayanam?
              </DialogTitle>
              <DialogDescription className="font-sans text-sm">
                Choose the parayanam whose garden you'd like to update.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSessionId(s.id)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-left font-sans text-sm font-semibold text-foreground transition-colors hover:border-primary"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">My Dashakam Garden</DialogTitle>
              {sessions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedSessionId(null)}
                  className="inline-flex items-center gap-1 self-start font-sans text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Switch parayanam
                </button>
              )}
            </DialogHeader>
            {sessionsLoading ? null : (
              <DashakamGarden
                blooms={myBlooms}
                tiles={myTiles}
                dashakamNumbers={dashakamNumbers}
                onTapDashakam={toggleDashakam}
                pendingDashakam={pending}
                loading={loading}
                title="My Dashakam Garden"
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
