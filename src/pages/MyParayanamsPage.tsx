import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Flower2, Loader2, Users } from "lucide-react";
import SEO from "@/components/SEO";
import {
  useParayanamReport,
  type ParayanamReport,
  type ReportStats,
} from "@/hooks/useParayanamReport";

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d.length <= 10 ? `${d}T00:00:00Z` : d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type Expanded = "completed" | "pending" | null;

/** Compact row: three numbers, each opening its own list. */
function StatsRow({ label, subtitle, stats }: { label: string; subtitle?: string; stats: ReportStats }) {
  const [open, setOpen] = useState<Expanded>(null);
  const toggle = (v: Expanded) => setOpen((prev) => (prev === v ? null : v));

  const numberBtn = (
    value: number,
    caption: string,
    kind: Expanded,
    tone: string,
    clickable = true
  ) => (
    <button
      type="button"
      disabled={!clickable}
      onClick={() => clickable && toggle(kind)}
      className={`min-w-[74px] rounded-lg border px-3 py-2 text-center transition-colors ${
        open === kind && clickable ? "border-primary bg-muted" : "border-border"
      } ${clickable ? "hover:border-primary" : "cursor-default"}`}
    >
      <span className={`block font-display text-xl font-bold ${tone}`}>{value}</span>
      <span className="block font-sans text-[11px] text-muted-foreground">{caption}</span>
    </button>
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-foreground">{label}</p>
          {subtitle && <p className="font-sans text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex gap-2">
          {numberBtn(stats.completed, "Completed", "completed", "text-primary")}
          {numberBtn(stats.notCompleted, "Not done", "pending", "text-muted-foreground")}
          {numberBtn(stats.blooms, "Blooms", null, "text-secondary", false)}
        </div>
      </div>

      {open === "completed" && (
        <div className="mt-3 border-t border-border pt-3">
          {stats.completedList.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">Nothing chanted yet.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {stats.completedList.map((c, i) => (
                <li key={`${c.dashakam_no}-${i}`} className="font-sans text-sm text-foreground">
                  Dashakam {c.dashakam_no}
                  {c.completed_at && (
                    <span className="text-muted-foreground"> · {fmtDate(c.completed_at)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open === "pending" && (
        <div className="mt-3 border-t border-border pt-3">
          {stats.notCompletedList.length === 0 ? (
            <p className="font-sans text-sm text-muted-foreground">All done — nothing pending.</p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {stats.notCompletedList.map((no, i) => (
                <li key={`${no}-${i}`} className="font-sans text-sm text-muted-foreground">
                  Dashakam {no}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ParayanamBlock({
  p,
  mode,
  isOwner,
}: {
  p: ParayanamReport;
  mode: "member" | "group";
  isOwner: boolean;
}) {
  const dates = `${fmtDate(p.start_date)} – ${fmtDate(p.end_date)}`;

  if (isOwner && mode === "member") {
    return (
      <div className="space-y-2">
        <p className="font-sans text-xs uppercase tracking-wide text-muted-foreground">
          {p.name} · {dates}
        </p>
        {p.members.length === 0 ? (
          <p className="font-sans text-sm text-muted-foreground">No confirmed participants yet.</p>
        ) : (
          p.members.map((m) => (
            <StatsRow key={m.user_id} label={m.display_name} stats={m.stats} />
          ))
        )}
      </div>
    );
  }

  if (isOwner && mode === "group") {
    return <StatsRow label={p.name} subtitle={`${dates} · whole group`} stats={p.aggregate} />;
  }

  return (
    <StatsRow
      label={p.name}
      subtitle={dates}
      stats={p.mine ?? { completedList: [], notCompletedList: [], completed: 0, notCompleted: 0, blooms: 0 }}
    />
  );
}

export default function MyParayanamsPage() {
  const [params] = useSearchParams();
  const groupFilter = params.get("group") ?? undefined;
  const { groups, loading, error } = useParayanamReport(groupFilter);
  const [mode, setMode] = useState<"member" | "group">("member");

  const anyOwned = useMemo(() => groups.some((g) => g.isOwner), [groups]);

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <SEO
        path="/my-parayanams"
        title="My Parayanams — Sriman Narayaneeyam"
        description="See every parayanam you have taken part in, grouped by group, with completed, pending and bloomed dashakams."
      />

      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Parayanams</h1>
          <p className="font-sans text-sm text-muted-foreground">
            {groupFilter ? "This group's parayanams." : "Grouped by group, then by parayanam."}
          </p>
        </div>
        <Link
          to="/progress"
          className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Progress
        </Link>
      </div>

      {anyOwned && (
        <div className="mb-6 inline-flex rounded-lg border border-border p-1">
          {(
            [
              { key: "member", label: "By member", icon: Users },
              { key: "group", label: "By group", icon: Flower2 },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-sans text-sm ${
                mode === t.key
                  ? "bg-gradient-peacock text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      ) : error ? (
        <p className="font-sans text-sm text-destructive">{error}</p>
      ) : groups.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          You have not taken part in a group parayanam yet.
        </p>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {groups.map((g) => (
            <section key={g.group_id}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {g.group_name}
                  {g.isOwner && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 font-sans text-[11px] text-muted-foreground">
                      Owner
                    </span>
                  )}
                </h2>
                <Link
                  to={`/groups/${g.group_id}`}
                  className="font-sans text-xs text-muted-foreground hover:text-foreground"
                >
                  Open group
                </Link>
              </div>
              {g.parayanams.length === 0 ? (
                <p className="font-sans text-sm text-muted-foreground">No parayanams yet.</p>
              ) : (
                <div className="space-y-4">
                  {g.parayanams.map((p) => (
                    <ParayanamBlock key={p.session_id} p={p} mode={mode} isOwner={g.isOwner} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </motion.div>
      )}
    </div>
  );
}
