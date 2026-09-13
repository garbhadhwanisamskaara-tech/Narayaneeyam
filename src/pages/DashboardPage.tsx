import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Info, Loader2, LogIn, Mic, Play, Repeat2, TrendingUp, Users } from "lucide-react";
import { getProgress } from "@/lib/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Progress } from "@/components/ui/progress";
import ProgressRing from "@/components/ProgressRing";
import SEO from "@/components/SEO";
import ActiveChallengeCard from "@/components/ActiveChallengeCard";
import { useParayanamReport, type ParayanamReport } from "@/hooks/useParayanamReport";
import Lotus from "@/components/Lotus";
import MyGardenDialog from "@/components/MyGardenDialog";
import MemberProgressDialog from "@/components/MemberProgressDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logoImg from "@/assets/logo.png";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" aria-label={text}>
          <Info className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 font-sans text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

export default function DashboardPage() {
  const localProgress = getProgress();
  const { displayName } = useAuth();
  const {
    completedDashakams,
    dashakamsCompleted,
    lastActivity,
    completionPercentage,
    isGuest,
    mostReturnedTo,
  } = useUserProgress();
  const { groups, loading: reportsLoading, error: reportsError } = useParayanamReport();
  const [gardenSession, setGardenSession] = useState<{ report: ParayanamReport; isOwner: boolean } | null>(null);
  const [memberReport, setMemberReport] = useState<ParayanamReport | null>(null);

  // Current position from local progress
  const currentDashakam = localProgress.chantState?.dashakam || localProgress.lastDashakam || 1;
  const currentVerse = localProgress.chantState?.verse
    ? localProgress.chantState.verse + 1
    : localProgress.lastParagraph || 1;

  // This Year — Chant vs. Listen breakdown (read-only, from user_progress)
  const currentYear = new Date().getFullYear();
  const yearlyRows = completedDashakams.filter(
    (r) =>
      new Date(r.completed_date).getFullYear() === currentYear &&
      (r.pathway_id === "chant" || r.pathway_id === "podcast")
  );
  const chantRows = yearlyRows.filter((r) => r.pathway_id === "chant");
  const listenRows = yearlyRows.filter((r) => r.pathway_id === "podcast");
  const chantTotal = chantRows.length;
  const chantUnique = new Set(chantRows.map((r) => r.dashakam_no)).size;
  const listenTotal = listenRows.length;
  const listenUnique = new Set(listenRows.map((r) => r.dashakam_no)).size;
  const feathersEarned = chantTotal + listenTotal;

  // Estimated completion
  const daysActive =
    completedDashakams.length > 0
      ? Math.max(1, new Set(completedDashakams.map((c) => c.completed_date)).size)
      : 1;
  const avgPerDay = daysActive > 0 ? dashakamsCompleted / daysActive : 0;
  const remaining = 100 - dashakamsCompleted;
  const estDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;

  const recentCompleted = completedDashakams.slice(0, 3);

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <SEO
        path="/dashboard"
        title="Your Progress — Sriman Narayaneeyam"
        description="Track your devotional journey through Sriman Narayaneeyam — completed Dashakams and your current chanting position."
      />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Greeting */}
        <div className="mb-8 text-center">
          <img src={logoImg} alt="Sriman Narayaneeyam" className="mx-auto mb-3 h-16 w-16 object-contain" />
          <h1 className="font-display text-3xl font-bold text-foreground">Namaste {displayName || ""}</h1>
          <p className="mt-1 font-sans text-sm text-muted-foreground">Your spiritual journey at a glance</p>
        </div>

        <ActiveChallengeCard />

        {/* Sign-in prompt for guests */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 mb-8"
          >
            <div className="flex items-center gap-4">
              <LogIn className="h-6 w-6 text-secondary shrink-0" />
              <div className="flex-1">
                <p className="font-display text-base font-semibold text-foreground">Sign in to track your progress</p>
                <p className="text-sm text-muted-foreground font-sans">
                  Your completed dashakams and journey progress will sync across devices.
                </p>
              </div>
              <Link
                to="/auth"
                className="rounded-lg bg-gradient-gold px-5 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105 shrink-0"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        )}

        {/* Key stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-xs font-semibold uppercase text-muted-foreground">Lifetime Dashakams</p>
              <InfoTip text="The unique dashakams you've ever completed, out of 100 — counted once each, no matter how many times you revisit them." />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="relative shrink-0">
                <ProgressRing percent={completionPercentage} size={68} strokeWidth={5} />
                <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-foreground">{completionPercentage}%</span>
              </div>
              <p className="font-display text-3xl font-bold text-primary">{dashakamsCompleted}<span className="text-base text-muted-foreground">/100</span></p>
            </div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-xs font-semibold uppercase text-muted-foreground">This Year</p>
            </div>
            <img src={logoImg} alt="" className="mt-3 h-8 w-8 object-contain" />
            <p className="mt-1 font-display text-3xl font-bold text-primary">{feathersEarned}</p>
            <p className="font-sans text-xs text-muted-foreground">Feathers Earned</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-sans text-xs text-muted-foreground">Chant</p>
                  <p className="font-display text-sm font-semibold text-foreground">{chantUnique} dashakams · {chantTotal} completions</p>
                </div>
                <InfoTip text="Dashakams chanted this year. Chanting the same dashakam more than once counts each time." />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-sans text-xs text-muted-foreground">Listen</p>
                  <p className="font-display text-sm font-semibold text-foreground">{listenUnique} dashakams · {listenTotal} completions</p>
                </div>
                <InfoTip text="Dashakams listened to this year. Listening to the same dashakam more than once counts each time." />
              </div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-sans text-xs text-muted-foreground">Feathers Earned</p>
                </div>
                <InfoTip text="Your Chant and Listen completions this year, added together." />
              </div>
            </div>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-lg border border-border bg-card p-4 sm:col-span-2 xl:col-span-1">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-xs font-semibold uppercase text-muted-foreground">Where You Are Right Now</p>
              <InfoTip text="Your most recently saved chanting position on this device." />
            </div>
            <p className="mt-4 font-display text-xl font-bold text-foreground">Dashakam {currentDashakam}</p>
            <p className="font-sans text-sm text-muted-foreground">Verse {currentVerse}</p>
            <Button asChild size="sm" className="mt-4 w-full">
              <Link to={`/chant?dashakam=${currentDashakam}`}><Play className="h-4 w-4" /> Continue Chanting</Link>
            </Button>
          </motion.article>

          <motion.article initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-sans text-xs font-semibold uppercase text-muted-foreground">Most Returned To</p>
              <InfoTip text={`The Dashakam you completed most often during ${currentYear}.`} />
            </div>
            <Repeat2 className="mt-4 h-6 w-6 text-secondary" />
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {mostReturnedTo ? `Dashakam ${mostReturnedTo.dashakamNo}` : "—"}
            </p>
            {mostReturnedTo && <p className="font-sans text-xs text-muted-foreground">{mostReturnedTo.count} returns</p>}
          </motion.article>
        </div>

        {/* Journey Completion Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5 mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm font-semibold text-foreground">
              Journey Progress — {dashakamsCompleted} / 100 Dashakams
            </span>
            <span className="text-xs text-muted-foreground font-sans">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3 mb-3" />

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-sans">
            {lastActivity && (
              <span>
                Last activity:{" "}
                {new Date(lastActivity).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            )}
            {estDays !== null && remaining > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Est. completion: ~{estDays} day{estDays !== 1 ? "s" : ""} ({avgPerDay.toFixed(1)}/day)
              </span>
            )}
            {remaining === 0 && <span className="text-secondary font-semibold">🎉 Journey Complete!</span>}
          </div>
        </motion.div>

        {/* Chant & Learn Mode Progress */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {[
            {
              label: "Chant Mode",
              icon: Mic,
              state: localProgress.chantState,
              page: "/chant",
              color: "hsl(var(--primary))",
            },
            {
              label: "Learn Mode",
              icon: BookOpen,
              state: localProgress.learnState as any,
              page: "/chant?mode=learn",
              color: "hsl(var(--secondary))",
            },
          ].map((mode) => (
            <motion.div
              key={mode.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: mode.color + "20" }}
                >
                  <mode.icon className="h-5 w-5" style={{ color: mode.color }} />
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold text-foreground">{mode.label}</h3>
                  {mode.state ? (
                    <p className="text-xs text-muted-foreground font-sans">
                      Dashakam {(mode.state as any)?.dashakam || "—"}, Verse {((mode.state as any)?.verse || 0) + 1}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-sans">Not started yet</p>
                  )}
                </div>
              </div>
              {mode.state && (
                <Link to={mode.page} className="text-xs font-sans text-primary hover:underline">
                  Resume →
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Recently Completed */}
        {recentCompleted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-border bg-card p-5 mb-8"
          >
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Recently Completed</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {recentCompleted.map((c) => (
                <div
                  key={`${c.pathway_id}-${c.dashakam_no}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3"
                >
                  <span className="h-12 w-12 shrink-0"><Lotus percent={100} /></span>
                  <span>
                    <span className="block font-display text-sm font-semibold text-primary">Dashakam {c.dashakam_no}</span>
                    <span className="font-sans text-xs text-muted-foreground">
                      {new Date(c.completed_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">My Parayanams</h2>
              <p className="font-sans text-sm text-muted-foreground">Open a parayanam to see its lotus garden.</p>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </div>
          {reportsLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : reportsError ? (
            <p className="font-sans text-sm text-destructive">{reportsError}</p>
          ) : groups.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-4 font-sans text-sm text-muted-foreground">No group parayanams yet.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.group_id} className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-semibold text-foreground">{group.group_name}</h3>
                      {group.isOwner && <span className="rounded-full bg-secondary/15 px-2 py-0.5 font-sans text-xs font-semibold text-secondary-foreground">You are the Owner</span>}
                      {group.isOwner && group.parayanams[0] && (
                        <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setMemberReport(group.parayanams[0])}>
                          View each member's progress →
                        </Button>
                      )}
                    </div>
                    <Link to={`/groups/${group.group_id}`} className="font-sans text-xs font-semibold text-primary hover:underline">Open group</Link>
                  </div>
                  <div className="space-y-2">
                    {group.parayanams.map((parayanam) => {
                      const stats = parayanam.mine ?? parayanam.aggregate;
                      const total = stats.completed + stats.notCompleted;
                      const percent = total > 0 ? Math.round((stats.completed / total) * 100) : 0;
                      return (
                        <div key={parayanam.session_id} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-auto min-w-0 justify-start px-0 text-left hover:bg-transparent"
                            onClick={() => setGardenSession({ report: parayanam, isOwner: group.isOwner })}
                          >
                            <span className="h-10 w-10 shrink-0"><Lotus percent={percent} /></span>
                            <span className="min-w-0">
                              <span className="block truncate font-display text-sm font-semibold text-foreground">{parayanam.name}</span>
                              <span className="block font-sans text-xs text-muted-foreground">{stats.completed} of {total} completed · {stats.blooms} blooms</span>
                            </span>
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Insights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Insights</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BookOpen, label: "Dashakams Done", value: `${dashakamsCompleted} / 100` },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <s.icon className="h-5 w-5 text-secondary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground font-sans">{s.label}</p>
                  <p className="font-display text-sm font-semibold text-foreground">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
      <MyGardenDialog
        open={gardenSession !== null}
        onOpenChange={(open) => !open && setGardenSession(null)}
        initialSessionId={gardenSession?.report.session_id}
        initialSessionLabel={gardenSession?.report.name}
        ownerReport={gardenSession?.isOwner ? gardenSession.report : null}
      />
      <MemberProgressDialog
        open={memberReport !== null}
        onOpenChange={(open) => !open && setMemberReport(null)}
        parayanam={memberReport}
      />
    </div>
  );
}
