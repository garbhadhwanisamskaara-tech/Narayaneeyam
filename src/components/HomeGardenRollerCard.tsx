import { useEffect, useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMyDashakamGarden } from "@/hooks/useMyDashakamGarden";
import { HIDDEN_SESSION_STATES_FILTER } from "@/lib/parayanamFilters";
import { Button } from "@/components/ui/button";
import Lotus from "@/components/Lotus";
import MyGardenDialog from "@/components/MyGardenDialog";

interface HomeGardenSession {
  id: string;
  parayanam_name: string | null;
  bloom_mode: string | null;
  groups: { group_name: string } | null;
}

function sessionLabel(session: HomeGardenSession) {
  return [session.groups?.group_name, session.parayanam_name].filter(Boolean).join(" – ") || "Group parayanam";
}

function GardenRoller({ session, open, onToggle, onOpenGarden }: {
  session: HomeGardenSession;
  open: boolean;
  onToggle: () => void;
  onOpenGarden: () => void;
}) {
  // Intentionally consume only read state; this home preview never toggles a lotus.
  const { blooms, occurrences, loading } = useMyDashakamGarden(session.id);
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const compact = occurrences.length > 20;
  const bloomed = occurrences.filter((item) => (blooms.get(item.key) ?? 0) >= 100).length;
  const label = sessionLabel(session);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-gold/40 bg-card text-left text-card-foreground shadow-gold">
      <div className="relative px-4 py-3">
        <p className="truncate font-display text-sm font-semibold" title={label}>{label}</p>
        <div className="flex min-h-11 items-center justify-between gap-2">
          <p className="min-w-0 font-sans text-xs text-muted-foreground" aria-live="polite">
            {loading ? "Tending the garden…" : `${bloomed} of ${occurrences.length} lotuses bloomed`}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0 text-gold-dark"
            aria-label={`${open ? "Collapse" : "Expand"} garden: ${label}`}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={onToggle}
          >
            <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.2 }}>
              <ChevronDown className="h-4 w-4" />
            </motion.span>
          </Button>
        </div>
      </div>
      <motion.div
        id={panelId}
        initial={false}
        animate={{ height: open ? "auto" : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden"
      >
        <div ref={(node) => node?.toggleAttribute("inert", !open)} aria-hidden={!open} className="px-3 pb-5 pt-1">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-4 font-sans text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> Tending the garden…
            </p>
          ) : (
            <div className={compact ? "grid grid-cols-10 gap-1" : "grid grid-cols-5 gap-2"}>
              {occurrences.map((item) => {
                const percent = blooms.get(item.key) ?? 0;
                const date = item.scheduledDate ? new Date(`${item.scheduledDate}T00:00:00`) : null;
                const dateLabel = date && !Number.isNaN(date.getTime())
                  ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                  : null;
                return (
                  <div
                    key={item.key}
                    role="img"
                    aria-label={`Dashakam ${item.dashakamNo}${dateLabel ? `, ${dateLabel}` : ""}, ${percent >= 100 ? "bloomed" : "not yet bloomed"}`}
                    className="flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg border border-border/60 bg-muted/40 p-0.5"
                  >
                    <span className="block min-h-0 w-full flex-1"><Lotus percent={percent} /></span>
                    <span className="font-display text-[9px] font-semibold leading-none text-muted-foreground">{item.dashakamNo}</span>
                    {!compact && dateLabel && <span className="mt-0.5 whitespace-nowrap font-sans text-[8px] leading-none text-muted-foreground">{dateLabel}</span>}
                  </div>
                );
              })}
            </div>
          )}
          {session.bloom_mode === "MY_READING" && (
            <Button type="button" variant="link" size="sm" className="mt-2 h-9 px-0 font-sans text-xs text-gold-dark" onClick={onOpenGarden}>
              Open garden
            </Button>
          )}
        </div>
      </motion.div>
      <motion.div
        aria-hidden="true"
        animate={{ y: open && !reducedMotion ? [0, 2, 0] : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.18, delay: open && !reducedMotion ? 0.4 : 0 }}
        className="pointer-events-none relative z-10 h-1 w-full rounded-full bg-gradient-gold"
      />
    </article>
  );
}

export default function HomeGardenRollerCard() {
  const { user } = useAuth();
  const userId = user?.id;
  const [result, setResult] = useState<{ userId: string; sessions: HomeGardenSession[] } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogSession, setDialogSession] = useState<HomeGardenSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOpenId(null);
    setDialogSession(null);
    if (!userId) return;
    const load = async () => {
      try {
        const { data: participants, error: participantError } = await supabase
          .from("parayanam_participants")
          .select("challenge_session_id")
          .eq("user_id", userId)
          .eq("status", "confirmed")
          .eq("access_status", "active");
        if (participantError) throw participantError;
        const ids = [...new Set((participants ?? []).map((item) => item.challenge_session_id))];
        if (!ids.length) {
          if (!cancelled) setResult({ userId, sessions: [] });
          return;
        }
        const yesterday = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const { data, error } = await supabase
          .from("challenge_sessions")
          .select("id, parayanam_name, bloom_mode, groups(group_name)")
          .in("id", ids)
          .not("group_id", "is", null)
          .not("technical_state", "in", HIDDEN_SESSION_STATES_FILTER)
          .eq("show_garden_on_home", true)
          .is("completed_at", null)
          .or(`end_date.is.null,end_date.gte.${yesterday}`)
          .order("created_at", { ascending: false });
        if (error) throw error;
        const sessions = (data ?? []).map((row) => {
          const session = row as unknown as Omit<HomeGardenSession, "groups"> & {
            groups: HomeGardenSession["groups"] | { group_name: string }[];
          };
          return { ...session, groups: Array.isArray(session.groups) ? session.groups[0] ?? null : session.groups };
        });
        if (!cancelled) setResult({ userId, sessions });
      } catch {
        if (!cancelled) setResult({ userId, sessions: [] });
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [userId]);

  const sessions = result?.userId === userId ? result?.sessions ?? [] : [];
  if (!sessions.length) return null;

  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      {sessions.map((session) => (
        <GardenRoller
          key={session.id}
          session={session}
          open={openId === session.id}
          onToggle={() => setOpenId((current) => current === session.id ? null : session.id)}
          onOpenGarden={() => setDialogSession(session)}
        />
      ))}
      {dialogSession && (
        <MyGardenDialog
          open
          onOpenChange={(open) => { if (!open) setDialogSession(null); }}
          initialSessionId={dialogSession.id}
          initialSessionLabel={sessionLabel(dialogSession)}
        />
      )}
    </div>
  );
}