import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { MemberReport, ParayanamReport } from "@/hooks/useParayanamReport";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Status = "Behind" | "On Track" | "Complete";
type Filter = "All" | Status;
type SortKey = "member" | "completed" | "expected" | "total" | "progress" | "status";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parayanam: ParayanamReport | null;
}

function memberStatus(member: MemberReport): Status {
  const total = member.stats.completed + member.stats.notCompleted;
  if (member.stats.completed >= total) return "Complete";
  return member.stats.completed >= member.stats.expected ? "On Track" : "Behind";
}

function memberPercent(member: MemberReport) {
  const total = member.stats.completed + member.stats.notCompleted;
  return total > 0 ? Math.round((member.stats.completed / total) * 100) : 0;
}

export default function MemberProgressDialog({ open, onOpenChange, parayanam }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [sortKey, setSortKey] = useState<SortKey>("member");
  const [ascending, setAscending] = useState(true);

  const rows = useMemo(() => {
    if (!parayanam) return [];
    const needle = search.trim().toLocaleLowerCase();
    return parayanam.members
      .filter((member) => !needle || member.display_name.toLocaleLowerCase().includes(needle))
      .filter((member) => filter === "All" || memberStatus(member) === filter)
      .sort((a, b) => {
        const totalA = a.stats.completed + a.stats.notCompleted;
        const totalB = b.stats.completed + b.stats.notCompleted;
        const values: Record<SortKey, [string | number, string | number]> = {
          member: [a.display_name.toLocaleLowerCase(), b.display_name.toLocaleLowerCase()],
          completed: [a.stats.completed, b.stats.completed],
          expected: [a.stats.expected, b.stats.expected],
          total: [totalA, totalB],
          progress: [memberPercent(a), memberPercent(b)],
          status: [memberStatus(a), memberStatus(b)],
        };
        const [av, bv] = values[sortKey];
        const compared = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return ascending ? compared : -compared;
      });
  }, [ascending, filter, parayanam, search, sortKey]);

  const changeSort = (key: SortKey) => {
    if (sortKey === key) setAscending((value) => !value);
    else {
      setSortKey(key);
      setAscending(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">Member progress</DialogTitle>
          <DialogDescription className="font-sans">
            {parayanam?.name ?? "Parayanam"} — visible only to the group owner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search member"
              aria-label="Search members by name"
              className="pl-9 font-sans"
            />
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filter member progress">
            {(["All", "Behind", "On Track", "Complete"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={filter === option ? "default" : "outline"}
                onClick={() => setFilter(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] border-collapse font-sans text-sm">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                {(
                  [
                    ["member", "Member"],
                    ["completed", "Completed"],
                    ["expected", "Expected"],
                    ["total", "Total"],
                    ["progress", "Progress"],
                    ["status", "Status"],
                  ] as const
                ).map(([key, label]) => (
                  <th key={key} scope="col" className="border-b border-border px-4 py-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => changeSort(key)}
                      className="inline-flex items-center gap-1 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {label}
                      {sortKey === key &&
                        (ascending ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const total = member.stats.completed + member.stats.notCompleted;
                const percent = memberPercent(member);
                const status = memberStatus(member);
                return (
                  <tr key={member.user_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-semibold text-foreground">{member.display_name}</td>
                    <td className="px-4 py-3 text-foreground">{member.stats.completed}</td>
                    <td className="px-4 py-3 text-foreground">{member.stats.expected}</td>
                    <td className="px-4 py-3 text-foreground">{total}</td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-32 items-center gap-2">
                        <Progress value={percent} className="h-2 bg-muted" />
                        <span className="w-10 text-right text-xs text-muted-foreground">{percent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                          status === "Complete" && "border-secondary/50 bg-secondary/10 text-secondary-foreground",
                          status === "On Track" && "border-primary/40 bg-primary/10 text-primary",
                          status === "Behind" && "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-8 text-center font-sans text-sm text-muted-foreground">No members match this view.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}