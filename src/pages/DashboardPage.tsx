import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, BookOpen, Clock, Mic, BarChart3, Share2, LogIn, TrendingUp, Play } from "lucide-react";
import { getProgress } from "@/lib/progress";
import { TOTAL_VERSES, sampleDashakams } from "@/data/narayaneeyam";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Progress } from "@/components/ui/progress";
import ProgressRing from "@/components/ProgressRing";

function getVerseOfTheDay(): { sanskrit: string; meaning: string; dashakam: number; verse: number } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const allVerses = sampleDashakams.flatMap(d => d.verses.map(v => ({ ...v, dashakamId: d.id })));
  if (allVerses.length === 0) return { sanskrit: "ॐ नमो भगवते वासुदेवाय", meaning: "Om, I bow to Lord Vasudeva", dashakam: 1, verse: 1 };
  const idx = dayOfYear % allVerses.length;
  const v = allVerses[idx];
  return { sanskrit: v.sanskrit || v.english, meaning: v.meaning_english || "", dashakam: v.dashakamId, verse: v.paragraph };
}

export default function DashboardPage() {
  const localProgress = getProgress();
  const { displayName, user } = useAuth();
  const {
    completedDashakams,
    dashakamsCompleted,
    lastActivity,
    currentStreak,
    completionPercentage,
    loading: progressLoading,
    isGuest,
  } = useUserProgress();
  const verseOfDay = getVerseOfTheDay();

  // Current position from local progress
  const currentDashakam = localProgress.chantState?.dashakam || localProgress.lastDashakam || 1;
  const currentVerse = localProgress.chantState?.verse ? localProgress.chantState.verse + 1 : localProgress.lastParagraph || 1;

  // Estimated completion
  const daysActive = completedDashakams.length > 0
    ? Math.max(1, new Set(completedDashakams.map(c => c.completed_date)).size)
    : Math.max(1, localProgress.totalSessions);
  const avgPerDay = daysActive > 0 ? dashakamsCompleted / daysActive : 0;
  const remaining = 100 - dashakamsCompleted;
  const estDays = avgPerDay > 0 ? Math.ceil(remaining / avgPerDay) : null;

  const handleShare = async () => {
    const text = `Verse of the Day (Dashakam ${verseOfDay.dashakam}, Verse ${verseOfDay.verse}):\n\n${verseOfDay.sanskrit}\n\n${verseOfDay.meaning}`;
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await navigator.clipboard.writeText(text); }
  };

  const recentCompleted = completedDashakams.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-1 flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" /> Progress
          </h1>
          <p className="text-muted-foreground font-sans text-lg">
            Namaste {displayName || ""} 🙏 — Your spiritual journey at a glance
          </p>
        </div>

        {/* Sign-in prompt for guests */}
        {isGuest && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 mb-8">
            <div className="flex items-center gap-4">
              <LogIn className="h-6 w-6 text-secondary shrink-0" />
              <div className="flex-1">
                <p className="font-display text-base font-semibold text-foreground">Sign in to track your progress</p>
                <p className="text-sm text-muted-foreground font-sans">Your streak, completed dashakams, and journey progress will sync across devices.</p>
              </div>
              <Link to="/auth" className="rounded-lg bg-gradient-gold px-5 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105 shrink-0">Sign In</Link>
            </div>
          </motion.div>
        )}

        {/* Key Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Dashakams", value: `${dashakamsCompleted}/100`, pct: completionPercentage, color: "hsl(var(--primary))" },
            { label: "Current Position", value: `D${currentDashakam} · V${currentVerse}`, pct: (currentDashakam / 100) * 100, color: "hsl(var(--secondary))" },
            { label: "Streak", value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}`, pct: Math.min(100, currentStreak * 10), color: "hsl(42, 70%, 50%)" },
            { label: "Sessions", value: `${localProgress.totalSessions}`, pct: Math.min(100, localProgress.totalSessions * 5), color: "hsl(var(--primary))" },
          ].map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-4 flex flex-col items-center">
              <div className="relative">
                <ProgressRing percent={item.pct} size={72} strokeWidth={5} color={item.color} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-xs font-bold text-foreground text-center leading-tight">{item.value}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-sans mt-2">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Journey Completion Bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-5 mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="font-display text-sm font-semibold text-foreground">
              Journey Progress — {dashakamsCompleted} / 100 Dashakams
            </span>
            <span className="text-xs text-muted-foreground font-sans">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3 mb-3" />

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-sans">
            {lastActivity && (
              <span>Last activity: {new Date(lastActivity).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            )}
            {estDays !== null && remaining > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Est. completion: ~{estDays} day{estDays !== 1 ? "s" : ""} ({avgPerDay.toFixed(1)}/day)
              </span>
            )}
            {remaining === 0 && (
              <span className="text-secondary font-semibold">🎉 Journey Complete!</span>
            )}
          </div>
        </motion.div>

        {/* Continue Chanting Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Continue where you left off</p>
              <p className="font-display text-lg font-semibold text-foreground">
                Dashakam {currentDashakam} — Verse {currentVerse}
              </p>
              {localProgress.lastSessionDate && (
                <p className="text-xs text-muted-foreground font-sans mt-1">Last session: {localProgress.lastSessionDate}</p>
              )}
            </div>
            <Link to={`/chant?dashakam=${currentDashakam}`}
              className="flex items-center gap-2 rounded-lg bg-gradient-gold px-5 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105">
              <Play className="h-4 w-4" /> Continue Chanting
            </Link>
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
            <motion.div key={mode.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: mode.color + "20" }}>
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
                <Link to={mode.page} className="text-xs font-sans text-primary hover:underline">Resume →</Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Devotion Streak */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl border border-border bg-card p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🪷</span>
              <Flame className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">
                {currentStreak} Day{currentStreak !== 1 ? "s" : ""} Chanting Streak
              </p>
              <p className="text-sm text-muted-foreground font-sans">
                {currentStreak > 0 ? "Keep the flame alive! 🔥" : "Start chanting today to begin your streak 🪔"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Recently Completed */}
        {recentCompleted.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-xl border border-border bg-card p-5 mb-8">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Recently Completed</h3>
            <div className="flex flex-wrap gap-2">
              {recentCompleted.map((c) => (
                <span key={`${c.pathway_id}-${c.dashakam_no}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-sans">
                  <span className="font-semibold text-primary">D{c.dashakam_no}</span>
                  <span className="text-muted-foreground">{new Date(c.completed_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Verse of the Day */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-xl bg-gradient-peacock p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gold-light font-sans uppercase tracking-widest">✦ Verse of the Day</p>
            <button onClick={handleShare} className="text-gold-light/60 hover:text-gold-light transition-colors"><Share2 className="h-4 w-4" /></button>
          </div>
          <p className="font-body text-base text-primary-foreground leading-relaxed mb-3 whitespace-pre-line line-clamp-4">{verseOfDay.sanskrit}</p>
          <div className="border-t border-primary-foreground/20 pt-3">
            <p className="text-sm text-gold-light font-sans leading-relaxed line-clamp-3">{verseOfDay.meaning}</p>
          </div>
          <p className="text-[10px] text-primary-foreground/40 font-sans mt-3">Dashakam {verseOfDay.dashakam} · Verse {verseOfDay.verse}</p>
        </motion.div>

        {/* Insights */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Insights</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BookOpen, label: "Dashakams Done", value: `${dashakamsCompleted} / 100` },
              { icon: Clock, label: "Total Time", value: `${localProgress.totalChantingMinutes} min` },
              { icon: Flame, label: "Current Streak", value: `${currentStreak} days` },
              { icon: Mic, label: "Total Sessions", value: `${localProgress.totalSessions}` },
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
    </div>
  );
}
