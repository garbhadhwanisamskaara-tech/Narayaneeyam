import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, GraduationCap, FileText, CalendarPlus, Flame, BookOpen } from "lucide-react";
import { getProgress } from "@/lib/progress";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    path: "/chant",
    icon: Mic,
    title: "Chant with Me",
    desc: "Chant along with synchronized text highlighting",
  },
  {
    path: "/learn",
    icon: GraduationCap,
    title: "Learn with Me",
    desc: "Guided learning with meaning and practice loops",
  },
  {
    path: "/script",
    icon: FileText,
    title: "Script Library",
    desc: "View slokas in 5 languages with transliteration",
  },
  {
    path: "/lesson-plan",
    icon: CalendarPlus,
    title: "Create Lesson Plan",
    desc: "Build your personal learning schedule",
  },
];

export default function Index() {
  const progress = getProgress();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Lord Krishna at Guruvayur" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-peacock-dark/80 via-peacock/60 to-background" />
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
              Sriman Narayaneeyam
            </h1>
            <p className="text-gold-light font-body text-lg md:text-xl max-w-2xl mx-auto mb-8">
              A sacred journey through 100 Dashakams — chant, learn, and grow
              in devotion with the divine grace of Guruvayurappan
            </p>
          </motion.div>

          {/* Continue where left off */}
          {progress.lastSessionDate && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-4 rounded-xl bg-card/90 backdrop-blur-sm px-6 py-4 shadow-gold"
            >
              <div className="text-left">
                <p className="text-sm text-muted-foreground font-sans">Continue where you left off</p>
                <p className="font-display text-foreground font-semibold">
                  Dashakam {progress.lastDashakam}, Para {progress.lastParagraph}
                </p>
              </div>
              <div className="flex items-center gap-2 text-secondary">
                <Flame className="h-5 w-5" />
                <span className="font-display font-bold text-lg">{progress.currentStreak}</span>
              </div>
              <Link
                to={progress.lastPage || "/chant"}
                className="rounded-lg bg-gradient-gold px-4 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
              >
                Resume
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Feature Cards */}
      <section className="container mx-auto px-4 -mt-8 relative z-10 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <Link
                to={f.path}
                className="group block rounded-xl border border-border bg-card p-6 shadow-md transition-all hover:shadow-gold hover:-translate-y-1"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-peacock">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground font-sans">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {[
            { label: "Verses Chanted", value: progress.completedVerses.length, icon: BookOpen },
            { label: "Streak Days", value: progress.currentStreak, icon: Flame },
            { label: "Minutes", value: progress.totalChantingMinutes, icon: Mic },
            { label: "Sessions", value: progress.totalSessions, icon: GraduationCap },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-gradient-peacock p-5 text-center"
            >
              <stat.icon className="h-5 w-5 text-gold-light mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs text-primary-foreground/70 font-sans">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
