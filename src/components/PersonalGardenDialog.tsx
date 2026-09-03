import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { usePersonalSessions } from "@/hooks/usePersonalSessions";
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
 * Floating "My Dashakam Garden" dialog — lets the user tap lotuses for a
 * personal parayanam without leaving the page they're on. When the user has
 * several active personal parayanams, a small picker comes first.
 */
export default function PersonalGardenDialog({ open, onOpenChange }: Props) {
  const { sessions, loading: sessionsLoading } = usePersonalSessions();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Fresh picker state each time the dialog opens.
  useEffect(() => {
    if (!open) setSelectedSessionId(null);
  }, [open]);

  // A single personal parayanam skips the picker entirely.
  useEffect(() => {
    if (open && sessions.length === 1) setSelectedSessionId(sessions[0].id);
  }, [open, sessions]);

  const { tiles, blooms, dashakamNumbers, loading, pending, toggleDashakam } =
    useSessionGarden(selectedSessionId);

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
                blooms={blooms}
                tiles={tiles}
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
