import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, BookOpen, Clock, Mic, GraduationCap, Headphones, Share2 } from "lucide-react";
import { getProgress, type UserProgress } from "@/lib/progress";
import { getLessonPlans } from "@/lib/lessonPlan";
import { TOTAL_VERSES, sampleDashakams } from "@/data/narayaneeyam";
import { useAuth } from "@/contexts/AuthContext";

function ProgressRing({ percent, size = 80, strokeWidth = 6, color = "hsl(var(--secondary))" }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth={strokeWidth} fill="none" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, delay: 0.3 }}
        strokeDasharray={circumference}
      />
    </svg>
  );
}

function getVerseOfTheDay(): { sanskrit: string; meaning: string; dashakam: number; verse: number } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  // Cycle through available verses
  const allVerses = sampleDashakams.flatMap(d => d.verses.map(v => ({ ...v, dashakamId: d.id })));
  if (allVerses.length === 0) {
    return { sanskrit: "ॐ नमो भगवते वासुदेवाय", meaning: "Om, I bow to Lord Vasudeva", dashakam: 1, verse: 1 };
  }
  const idx = dayOfYear % allVerses.length;
  const v = allVerses[idx];
  return {
    sanskrit: v.sanskrit || v.english,
    meaning: v.meaning_english || "",
    dashakam: v.dashakamId,
    verse: v.paragraph,
  };
}

export default function DashboardPage() {
  const [progress, setProgress] = useState<UserProgress>(getProgress());
  const { displayName } = useAuth();
  const plans = getLessonPlans();
  const verseOfDay = getVerseOfTheDay();

  const completionPct = TOTAL_VERSES > 0
    ? Math.round((progress.completedVerses.length / TOTAL_VERSES) * 100)
    : 0;

  const modules = [
    {
      path: "/chant",
      icon: Mic,
      title: "Chant With Me",
      desc: "Follow along with synchronized text highlighting and audio",
      color: "hsl(var(--primary))",
    },
    {
      path: "/learn",
      icon: GraduationCap,
      title: "Learn With Me",
      desc: "Guided learning with practice loops and silence gaps",
      color: "hsl(var(--secondary))",
    },
    {
      path: "/podcast",
      icon: Headphones,
      title: "Podcast",
      desc: "Listen to dashakams in the background, anytime",
      color: "hsl(42, 70%, 40%)",
    },
  ];

  const handleShare = async () => {
    const text = `Verse of the Day (Dashakam ${verseOfDay.dashakam}, Verse ${verseOfDay.verse}):\n\n${verseOfDay.sanskrit}\n\n${verseOfDay.meaning}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-1">Narayaneeyam Sadhana</h1>
          <p className="text-muted-foreground font-sans text-lg">
            Namaste {displayName ? displayName : ""} 🙏 — Continue your spiritual journey today
          </p>
        </div>

        {/* Daily Progress Ring */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Verses", pct: completionPct, val: progress.completedVerses.length },
            { label: "Minutes", pct: Math.min(100, progress.totalChantingMinutes), val: progress.totalChantingMinutes },
            { label: "Sessions", pct: Math.min(100, progress.totalSessions * 10), val: progress.totalSessions },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-4 flex flex-col items-center"
            >
              <div className="relative">
                <ProgressRing percent={item.pct} size={72} strokeWidth={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-display text-lg font-bold text-foreground">{item.val}</span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-sans mt-2">{item.label}</span>
            </motion.div>
          ))}
        </div>

        {/* Module Cards */}
        <div className="space-y-3 mb-8">
          {modules.map((m, i) => (
            <motion.div
              key={m.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Link
                to={m.path}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:shadow-gold hover:-translate-y-0.5"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: m.color + "20" }}
                >
                  <m.icon className="h-6 w-6" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-sm text-muted-foreground font-sans">{m.desc}</p>
                </div>
                <span className="text-muted-foreground text-xl">→</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Verse of the Day */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl bg-gradient-peacock p-6 mb-8"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gold-light font-sans uppercase tracking-widest">✦ Verse of the Day</p>
            <button onClick={handleShare} className="text-gold-light/60 hover:text-gold-light transition-colors">
              <Share2 className="h-4 w-4" />
            </button>
          </div>
          <p className="font-body text-base text-primary-foreground leading-relaxed mb-3 whitespace-pre-line line-clamp-4">
            {verseOfDay.sanskrit}
          </p>
          <div className="border-t border-primary-foreground/20 pt-3">
            <p className="text-sm text-gold-light font-sans leading-relaxed line-clamp-3">{verseOfDay.meaning}</p>
          </div>
          <p className="text-[10px] text-primary-foreground/40 font-sans mt-3">
            Dashakam {verseOfDay.dashakam} · Verse {verseOfDay.verse}
          </p>
        </motion.div>

        {/* Devotion Streak */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-border bg-card p-6 mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🪷</span>
              <Flame className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">
                {progress.currentStreak} Day{progress.currentStreak !== 1 ? "s" : ""} Chanting Streak
              </p>
              <p className="text-sm text-muted-foreground font-sans">
                Longest: {progress.longestStreak} day{progress.longestStreak !== 1 ? "s" : ""} · Keep the flame alive! 🔥
              </p>
            </div>
          </div>
        </motion.div>

        {/* Resume Practice */}
        {progress.lastSessionDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-xl border border-secondary/30 bg-secondary/5 p-5 mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-sans uppercase tracking-wide mb-1">Resume Practice</p>
                <p className="font-display text-lg font-semibold text-foreground">
                  Dashakam {progress.lastDashakam} — Verse {progress.lastParagraph || 1}
                </p>
                <p className="text-xs text-muted-foreground font-sans mt-1">
                  Last session: {progress.lastSessionDate}
                </p>
              </div>
              <Link
                to={progress.lastPage || "/chant"}
                className="rounded-lg bg-gradient-gold px-5 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
              >
                Resume
              </Link>
            </div>
          </motion.div>
        )}

        {/* Weekly Insights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-xl border border-border bg-card p-6"
        >
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Insights</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: BookOpen, label: "Verses Done", value: `${progress.completedVerses.length} / ${TOTAL_VERSES}` },
              { icon: Clock, label: "Total Time", value: `${progress.totalChantingMinutes} min` },
              { icon: Flame, label: "Current Streak", value: `${progress.currentStreak} days` },
              { icon: GraduationCap, label: "Lesson Plans", value: `${plans.length}` },
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
