import { useCallback, useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompleteDashakam } from "@/hooks/useCompleteDashakam";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BudRow {
  id: string;
  dashakam_no: number;
  scheduled_date: string;
  assigned_user_id: string | null;
  completed: boolean;
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
  const { markDashakamComplete, pendingId } = useCompleteDashakam();
  const [rows, setRows] = useState<BudRow[]>([]);
  const [members, setMembers] = useState<Record<string, MemberInfo>>({});
  const [loading, setLoading] = useState(true);

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
        .select("id, dashakam_no, scheduled_date, assigned_user_id, completed")
        .eq("challenge_session_id", challengeSessionId)
        .order("scheduled_date", { ascending: true })
        .order("dashakam_no", { ascending: true });
      if (!active) return;
      setRows(((data ?? []) as BudRow[]).map((r) => ({ ...r, completed: !!r.completed })));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [challengeSessionId]);

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

  const handleClick = useCallback(
    async (row: BudRow) => {
      if (row.completed || !user || row.assigned_user_id !== user.id) return;
      // optimistic bloom
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, completed: true } : r)));
      const ok = await markDashakamComplete(row.id);
      if (!ok) setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, completed: false } : r)));
    },
    [user, markDashakamComplete]
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
    return <p className="text-sm text-muted-foreground font-sans">No dashakams scheduled yet.</p>;
  }

  const renderBud = (row: BudRow) => {
    const mine = !!user && row.assigned_user_id === user.id;
    const clickable = mine && !row.completed;
    return (
      <button
        key={row.id}
        type="button"
        disabled={!clickable || pendingId === row.id}
        onClick={() => handleClick(row)}
        aria-label={`Dashakam ${row.dashakam_no}${row.completed ? " — bloomed" : ""}`}
        className={cn(
          "relative flex aspect-square flex-col items-center justify-center rounded-xl border transition-all duration-300",
          row.completed
            ? "border-secondary/50 bg-secondary/10 text-secondary shadow-gold scale-[1.04]"
            : "border-border bg-muted/40 text-muted-foreground",
          clickable && "cursor-pointer hover:border-secondary/60 hover:scale-105",
          !clickable && "cursor-default"
        )}
      >
        <BudIcon bloomed={row.completed} />
        <span
          className={cn(
            "font-display text-[11px] font-semibold leading-none",
            row.completed ? "text-secondary" : "text-muted-foreground"
          )}
        >
          {row.dashakam_no}
        </span>
      </button>
    );
  };

  const grid = (
    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
      {rows.map((row) => {
        if (!showOwnerTools) return renderBud(row);
        const member = row.assigned_user_id ? members[row.assigned_user_id] : undefined;
        const name = member?.display_name || "Unassigned";
        return (
          <Tooltip key={row.id}>
            <TooltipTrigger asChild>
              <div>{renderBud(row)}</div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px]">
              <p className="font-display text-xs font-semibold text-foreground">{name}</p>
              <p className="text-[11px] text-muted-foreground font-sans mb-2">
                {member?.email || "email not available"}
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

  return showOwnerTools ? <TooltipProvider delayDuration={150}>{grid}</TooltipProvider> : grid;
}
