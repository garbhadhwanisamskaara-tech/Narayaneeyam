import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { useSessionParticipants } from "@/hooks/useParayanamParticipants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BudRow {
  id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
}

interface MemberInfo {
  id: string;
  display_name: string | null;
  email: string | null;
}

interface BudGridProps {
  challengeSessionId: string;
  /** Group-owner view: hover tooltip with member details + reminder links */
  showOwnerTools?: boolean;
  /** Used in the mailto copy */
  parayanamName?: string;
}

function BudIcon({ bloomed }: { bloomed: boolean }) {
  return (
    <svg viewBox="0 0 32 40" className="h-8 w-8" aria-hidden="true">
      {bloomed ? (
        <>
          <ellipse cx="16" cy="16" rx="6" ry="9" fill="currentColor" opacity="0.95" />
          <ellipse cx="8" cy="18" rx="5" ry="8" fill="currentColor" opacity="0.7" transform="rotate(-28 8 18)" />
          <ellipse cx="24" cy="18" rx="5" ry="8" fill="currentColor" opacity="0.7" transform="rotate(28 24 18)" />
        </>
      ) : (
        <ellipse cx="16" cy="18" rx="5" ry="9" fill="currentColor" opacity="0.55" />
      )}
      <path d="M16 26 L16 38" stroke="currentColor" strokeWidth="1.5" opacity="0.5" fill="none" />
    </svg>
  );
}

export default function BudGrid({ challengeSessionId, showOwnerTools = false, parayanamName }: BudGridProps) {
  const { user } = useAuth();
  const { markDashakamComplete, unmarkDashakamComplete, pendingId } = useCompleteDashakam();
  const { participants } = useSessionParticipants(challengeSessionId);
  const [rows, setRows] = useState<BudRow[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  /** schedule_id → whether the current user has completed it */
  const [mine, setMine] = useState<Set<string>>(new Set());
  /** schedule_id → how many people have completed it */
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const confirmedCount = useMemo(
    () => participants.filter((p) => p.status === "confirmed").length,
    [participants]
  );
  const isConfirmedParticipant = useMemo(
    () => !!user && participants.some((p) => p.user_id === user.id && p.status === "confirmed"),
    [participants, user]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      if (!challengeSessionId) {
        setRows([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await (supabase as any)
        .from("parayanam_schedule")
        .select("id, dashakam_no, scheduled_date, assigned_user_id")
        .eq("challenge_session_id", challengeSessionId)
        .order("scheduled_date", { ascending: true })
        .order("dashakam_no", { ascending: true });
      if (!active) return;
      const scheduleRows = (data ?? []) as BudRow[];
      setRows(scheduleRows);

      const ids = scheduleRows.map((r) => r.id);
      if (ids.length) {
        const { data: progress } = await (supabase as any)
          .from("parayanam_member_progress")
          .select("schedule_id, user_id")
          .in("schedule_id", ids);
        if (!active) return;
        const mineSet = new Set<string>();
        const countMap: Record<string, number> = {};
        for (const p of (progress ?? []) as { schedule_id: string; user_id: string }[]) {
          countMap[p.schedule_id] = (countMap[p.schedule_id] ?? 0) + 1;
          if (user && p.user_id === user.id) mineSet.add(p.schedule_id);
        }
        setMine(mineSet);
        setCounts(countMap);
      } else {
        setMine(new Set());
        setCounts({});
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [challengeSessionId, user?.id]);

  const assignedIds = useMemo(
    () => Array.from(new Set(rows.map((r) => r.assigned_user_id).filter(Boolean))) as string[],
    [rows]
  );

  useEffect(() => {
    if (!showOwnerTools || assignedIds.length === 0) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, display_name, email")
        .in("id", assignedIds);
      if (!active) return;
      const map: Record<string, MemberInfo> = {};
      ((data ?? []) as MemberInfo[]).forEach((m) => {
        map[m.id] = m;
      });
      setMembers(map);
    })();
    return () => {
      active = false;
    };
  }, [showOwnerTools, assignedIds]);

  /** Split mode: only the assigned chanter. Synchronized: any confirmed participant. */
  const canTap = useCallback(
    (row: BudRow) => {
      if (!user) return false;
      if (row.assigned_user_id) return row.assigned_user_id === user.id;
      return isConfirmedParticipant;
    },
    [user, isConfirmedParticipant]
  );

  const handleClick = useCallback(
    async (row: BudRow) => {
      if (!canTap(row)) return;
      const done = mine.has(row.id);
      // optimistic bloom
      setMine((prev) => {
        const next = new Set(prev);
        if (done) next.delete(row.id);
        else next.add(row.id);
        return next;
      });
      setCounts((prev) => ({ ...prev, [row.id]: Math.max(0, (prev[row.id] ?? 0) + (done ? -1 : 1)) }));

      const ok = done ? await unmarkDashakamComplete(row.id) : await markDashakamComplete(row.id);
      if (!ok) {
        setMine((prev) => {
          const next = new Set(prev);
          if (done) next.add(row.id);
          else next.delete(row.id);
          return next;
        });
        setCounts((prev) => ({ ...prev, [row.id]: Math.max(0, (prev[row.id] ?? 0) + (done ? 1 : -1)) }));
      }
    },
    [canTap, mine, markDashakamComplete, unmarkDashakamComplete]
  );

  const mailto = (email: string | null, kind: "reminder" | "thanks", dashakam: number, name: string) => {
    const journey = parayanamName ? ` for ${parayanamName}` : "";
    const subject =
      kind === "reminder"
        ? `A gentle reminder — Dashakam ${dashakam}`
        : `Thank you for Dashakam ${dashakam}`;
    const body =
      kind === "reminder"
        ? `Namaste ${name},\n\nA gentle reminder that Dashakam ${dashakam}${journey} is waiting for your voice. Whenever you are ready 🙏\n\nWith warmth,`
        : `Namaste ${name},\n\nThank you for chanting Dashakam ${dashakam}${journey}. Your devotion carries all of us forward 🙏\n\nWith gratitude,`;
    return `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground font-sans">
        The day-by-day schedule is prepared automatically when this parayanam begins.
      </p>
    );
  }

  const renderBud = (row: BudRow) => {
    const done = mine.has(row.id);
    const clickable = canTap(row);
    const total = counts[row.id] ?? 0;
    return (
      <button
        key={row.id}
        type="button"
        disabled={!clickable || pendingId === row.id}
        onClick={() => handleClick(row)}
        aria-label={`Dashakam ${row.dashakam_no}${done ? " — completed by you" : ""}${
          total ? ` — ${total}${confirmedCount ? ` of ${confirmedCount}` : ""} done` : ""
        }`}
        className={cn(
          "relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-all duration-300",
          done
            ? "border-secondary/50 bg-secondary/10 text-secondary shadow-gold scale-[1.04]"
            : "border-border bg-muted/40 text-muted-foreground",
          clickable && "cursor-pointer hover:border-secondary/60 hover:scale-105",
          !clickable && "cursor-default"
        )}
      >
        <BudIcon bloomed={done} />
        <span
          className={cn(
            "font-display text-[11px] font-semibold leading-none",
            done ? "text-secondary" : "text-muted-foreground"
          )}
        >
          {row.dashakam_no}
        </span>
        {total > 0 && (
          <span className="mt-0.5 font-sans text-[9px] leading-none text-muted-foreground">
            {total}
            {confirmedCount ? `/${confirmedCount}` : ""}
          </span>
        )}
      </button>
    );
  };

  const grid = (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
      {rows.map((row) => {
        if (!showOwnerTools) return renderBud(row);
        const member = row.assigned_user_id ? members[row.assigned_user_id] : undefined;
        const name = member?.display_name || "Everyone";
        return (
          <Tooltip key={row.id}>
            <TooltipTrigger asChild>
              <div>{renderBud(row)}</div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="font-display text-xs font-semibold text-foreground">{name}</p>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">
                {(counts[row.id] ?? 0)}
                {confirmedCount ? ` of ${confirmedCount}` : ""} done
              </p>
              <div className="flex gap-3">
                <a
                  href={mailto(member?.email ?? null, "reminder", row.dashakam_no, name)}
                  className="text-[11px] font-sans text-primary hover:underline"
                >
                  Send reminder
                </a>
                <a
                  href={mailto(member?.email ?? null, "thanks", row.dashakam_no, name)}
                  className="text-[11px] font-sans text-primary hover:underline"
                >
                  Send thank you
                </a>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  const infoTip = (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="How to mark dashakams done"
          className="inline-flex text-muted-foreground hover:text-foreground focus:outline-none"
        >
          <Info className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px]">
        <p className="font-sans text-xs text-popover-foreground">
          Tap a dashakam once you've completed it — listening or reading — to mark it done for yourself. Tap again to
          undo. The small number shows how many in the group have finished it.
        </p>
      </TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-2">
        <div className="flex items-center justify-end gap-2">{infoTip}</div>
        {grid}
      </div>
    </TooltipProvider>
  );
}
