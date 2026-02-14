import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame, BookOpen, Clock, Calendar, Trophy, TrendingUp } from "lucide-react";
import { getProgress, type UserProgress } from "@/lib/progress";
import { getLessonPlans } from "@/lib/lessonPlan";
import { TOTAL_VERSES, TOTAL_DASHAKAMS } from "@/data/narayaneeyam";

export default function DashboardPage() {
  const [progress, setProgress] = useState<UserProgress>(getProgress());
  const plans = getLessonPlans();

  const totalLessons = plans.reduce((sum, p) => sum + p.lessons.length, 0);
  const completedLessons = plans.reduce(
    (sum, p) => sum + p.lessons.filter((l) => l.completed).length,
    0
  );
  const completionPct = TOTAL_VERSES > 0
    ? Math.round((progress.completedVerses.length / TOTAL_VERSES) * 100)
    : 0;

  const stats = [
    { label: "Current Streak", value: progress.currentStreak, unit: "days", icon: Flame, color: "text-secondary" },
    { label: "Longest Streak", value: progress.longestStreak, unit: "days", icon: Trophy, color: "text-gold-dark" },
    { label: "Verses Completed", value: progress.completedVerses.length, unit: `/ ${TOTAL_VERSES}`, icon: BookOpen, color: "text-primary" },
    { label: "Chanting Minutes", value: progress.totalChantingMinutes, unit: "min", icon: Clock, color: "text-peacock-light" },
    { label: "Total Sessions", value: progress.totalSessions, unit: "", icon: Calendar, color: "text-secondary" },
    { label: "Completion", value: completionPct, unit: "%", icon: TrendingUp, color: "text-gold-dark" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Your Dashboard</h1>
          <p className="text-muted-foreground font-sans">
            Track your spiritual journey through Narayaneeyam
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground font-sans">{stat.label}</span>
              </div>
              <p className="font-display text-3xl font-bold text-foreground">
                {stat.value}
                <span className="text-sm text-muted-foreground font-sans ml-1">{stat.unit}</span>
              </p>
            </motion.div>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="rounded-xl bg-gradient-peacock p-6 mb-8">
          <h3 className="font-display text-lg font-semibold text-primary-foreground mb-4">
            Overall Progress
          </h3>
          <div className="h-3 rounded-full bg-primary-foreground/20 overflow-hidden mb-3">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPct}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full rounded-full bg-gradient-gold"
            />
          </div>
          <div className="flex justify-between text-sm text-primary-foreground/80 font-sans">
            <span>{progress.completedVerses.length} verses completed</span>
            <span>{TOTAL_VERSES - progress.completedVerses.length} remaining</span>
          </div>
        </div>

        {/* Lesson Plans Summary */}
        {plans.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              Lesson Plans
            </h3>
            <div className="space-y-3">
              {plans.map((plan) => {
                const done = plan.lessons.filter((l) => l.completed).length;
                const pct = plan.lessons.length > 0 ? Math.round((done / plan.lessons.length) * 100) : 0;
                return (
                  <div key={plan.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground font-sans">
                        Dashakam {plan.dashakamStart}–{plan.dashakamEnd}
                      </p>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-gradient-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground font-sans w-12 text-right">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">
            Weekly Insights
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground font-sans">
            <p>📊 You have completed {progress.completedVerses.length} out of {TOTAL_VERSES} verses</p>
            <p>⏱ Total chanting time: {progress.totalChantingMinutes} minutes</p>
            <p>🔥 Current streak: {progress.currentStreak} days</p>
            {progress.lastSessionDate && (
              <p>📅 Last session: {progress.lastSessionDate}</p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
