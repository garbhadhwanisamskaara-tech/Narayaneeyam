import { UsersRound } from "lucide-react";
import type { GroupMember } from "@/hooks/useGroups";

interface Props {
  members: GroupMember[];
  ownerId: string | undefined;
  selected: string[];
  onToggle: (userId: string) => void;
  onSelectAll: (ids: string[]) => void;
  onDeselectAll: () => void;
  includeSelf: boolean;
  onIncludeSelfChange: (next: boolean) => void;
}

/** Checkbox list of group members to invite to a parayanam. */
export default function ParticipantPicker({
  members,
  ownerId,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  includeSelf,
  onIncludeSelfChange,
}: Props) {
  const others = members.filter((m) => m.user_id !== ownerId);
  const othersIds = others.map((m) => m.user_id);
  const allSelected = others.length > 0 && othersIds.every((id) => selected.includes(id));
  const noneSelected = !othersIds.some((id) => selected.includes(id));

  return (
    <div>
      <p className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground">
        <UsersRound className="h-4 w-4 text-primary" /> Who is chanting?
      </p>
      <p className="mt-1 font-sans text-xs text-muted-foreground">
        Invited members get a request to accept or decline. The day-by-day schedule is prepared automatically when the
        parayanam begins.
      </p>

      <label className="mt-3 flex items-center gap-3 rounded-xl border border-border px-3 py-2">
        <input
          type="checkbox"
          checked={includeSelf}
          onChange={(e) => onIncludeSelfChange(e.target.checked)}
          className="h-4 w-4 accent-primary"
        />
        <span className="font-sans text-sm text-foreground">I'm also chanting in this parayanam</span>
      </label>

      {others.length === 0 ? (
        <p className="mt-3 font-sans text-xs text-muted-foreground">
          No other members yet — invite people to the group first.
        </p>
      ) : (
        <ul className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-2">
          {others.map((m) => (
            <li key={m.user_id}>
              <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                <input
                  type="checkbox"
                  checked={selected.includes(m.user_id)}
                  onChange={() => onToggle(m.user_id)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="font-sans text-sm text-foreground">{m.display_name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
