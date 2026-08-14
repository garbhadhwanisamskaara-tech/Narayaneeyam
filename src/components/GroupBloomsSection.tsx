import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import BudGrid from "@/components/BudGrid";
import { useGroupActiveSessions, sessionLabel } from "@/hooks/useGroupActiveSessions";

interface Props {
  groupId: string | undefined;
  isOwner: boolean;
  /** The group's designated active parayanam, used as the default selection. */
  activeChallengeSessionId?: string | null;
  /** Owner display name, used when a non-owner sees the empty state. */
  ownerName?: string | null;
  /** Bump to force the schedule grid to refetch (e.g. after a manual start). */
  refreshKey?: number;
}

/** Parayanam progress grid for a group, with a switcher when several parayanams run at once. */
export default function GroupBloomsSection({
  groupId,
  isOwner,
  activeChallengeSessionId,
  ownerName,
  refreshKey = 0,
}: Props) {
  const { sessions, loading } = useGroupActiveSessions(groupId);
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (sessions.length && !sessions.some((s) => s.id === selectedId)) {
      const preferred = sessions.find((s) => s.id === activeChallengeSessionId);
      setSelectedId((preferred ?? sessions[0]).id);
    }
  }, [sessions, selectedId, activeChallengeSessionId]);

  const active = sessions.find((s) => s.id === selectedId) ?? sessions[0];

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Sprout className="h-5 w-5 text-secondary" /> Parayanam Progress
        </h2>
        {sessions.length > 1 && (
          <select
            aria-label="Choose parayanam"
            value={active?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 font-sans text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {sessionLabel(s)}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <p className="font-sans text-sm text-muted-foreground">Loading parayanams…</p>
      ) : !active ? (
        isOwner ? (
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="font-display text-base font-semibold text-foreground">No parayanam running yet</h3>
            <p className="mt-1 font-sans text-sm text-muted-foreground">
              As the group owner, you can plan a parayanam — pick which dashakams to include, a timeline, and how
              they're shared: everyone chants the same dashakam each day (Synchronized), or dashakams are split across
              members (Split).
            </p>
            {groupId && (
              <Link
                to={`/groups/${groupId}/schedule`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Plan a parayanam
              </Link>
            )}
          </div>
        ) : (
          <p className="font-sans text-sm text-muted-foreground">
            No parayanam running yet. Ask {ownerName ?? "the group owner"} to start one.
          </p>
        )
      ) : (
        <BudGrid key={`${active.id}-${refreshKey}`} challengeSessionId={active.id} showOwnerTools={isOwner} parayanamName={active.set_name} />
      )}
    </section>
  );
}
