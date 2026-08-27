import { useState } from "react";
import { CalendarDays, Check, ChevronDown, ChevronUp, Loader2, User } from "lucide-react";
import {
  formatScheduleDate,
  useMyParayanamSchedule,
  useParayanamScheduleView,
} from "@/hooks/useParayanamScheduleViews";

interface Props {
  challengeSessionId: string | null | undefined;
  /** Bump to refetch (e.g. after a manual start). */
  refreshKey?: number;
}

function SectionShell({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          {icon} {title}
        </h2>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}

export default function ParayanamScheduleViews({ challengeSessionId, refreshKey = 0 }: Props) {
  const [fullOpen, setFullOpen] = useState(false);
  const [mineOpen, setMineOpen] = useState(false);

  const key = `${challengeSessionId ?? ""}-${refreshKey}`;

  if (!challengeSessionId) return null;

  return (
    <div key={key}>
      <MySchedule sessionId={challengeSessionId} open={mineOpen} onToggle={() => setMineOpen((v) => !v)} />
      <FullSchedule sessionId={challengeSessionId} open={fullOpen} onToggle={() => setFullOpen((v) => !v)} />
    </div>
  );
}

function MySchedule({ sessionId, open, onToggle }: { sessionId: string; open: boolean; onToggle: () => void }) {
  const { rows, loading, error } = useMyParayanamSchedule(sessionId);

  return (
    <SectionShell title="My schedule" icon={<User className="h-5 w-5 text-primary" />} open={open} onToggle={onToggle}>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : error ? (
        <p className="font-sans text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          Nothing assigned to you yet — your dashakams appear here once the parayanam begins.
        </p>
      ) : (
        <div className="max-h-52 overflow-auto rounded-xl border border-border">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Dashakam</th>
                <th className="px-4 py-3">Done</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.scheduled_date}-${r.dashakam_no}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{formatScheduleDate(r.scheduled_date)}</td>
                  <td className="px-4 py-2 font-semibold text-foreground">{r.dashakam_no}</td>
                  <td className="px-4 py-2">
                    {r.completed ? (
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Completed</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}

function FullSchedule({ sessionId, open, onToggle }: { sessionId: string; open: boolean; onToggle: () => void }) {
  const { rows, loading, error } = useParayanamScheduleView(sessionId);

  return (
    <SectionShell
      title="Full schedule"
      icon={<CalendarDays className="h-5 w-5 text-primary" />}
      open={open}
      onToggle={onToggle}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      ) : error ? (
        <p className="font-sans text-sm text-destructive">{error}</p>
      ) : rows.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          The day-by-day schedule is prepared automatically when the parayanam begins.
        </p>
      ) : (
        <div className="max-h-52 overflow-auto rounded-xl border border-border">
          <table className="w-full font-sans text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Dashakam</th>
                <th className="px-4 py-3">Who's chanting</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.scheduled_date}-${r.dashakam_no}`} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-2 text-muted-foreground">{formatScheduleDate(r.scheduled_date)}</td>
                  <td className="px-4 py-2 font-semibold text-foreground">{r.dashakam_no}</td>
                  <td className="px-4 py-2 text-foreground">{r.assigned_names || "Everyone"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionShell>
  );
}
