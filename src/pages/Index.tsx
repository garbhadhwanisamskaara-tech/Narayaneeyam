import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, FileText, Flame, BookOpen, Headphones, ChevronDown, ChevronUp, MoreHorizontal, LifeBuoy, Bookmark, Heart, Settings } from "lucide-react";
import { getProgress } from "@/lib/progress";
import heroBg from "@/assets/hero-bg.jpg";
import FestivalBanner from "@/components/FestivalBanner";
import { supabase } from "@/integrations/supabase/client";

const mainFeatures = [
  { path: "/chant", icon: Mic, title: "Chant with Me", desc: "Chant along with synchronized text highlighting" },
  { path: "/podcast", icon: Headphones, title: "Podcast", desc: "Listen to dashakams in the background" },
];

const moreFeatures = [
  { path: "/script", icon: FileText, title: "Script Library", desc: "View slokas in multiple scripts with transliteration" },
  { path: "/saved-places", icon: Bookmark, title: "Bookmarks", desc: "Your saved verses for quick access" },
  { path: "/heart-shelf", icon: Heart, title: "Favourites", desc: "Slokas close to your heart" },
  { path: "/support", icon: LifeBuoy, title: "Support", desc: "Get help or report an issue" },
  { path: "/user-guide", icon: Settings, title: "Settings & Guide", desc: "App guide and preferences" },
];

export default function Index() {
  const progress = getProgress();
  const [showAbout, setShowAbout] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [festivalMessage, setFestivalMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFestival() {
      try {
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const todayIST = nowIST.toISOString().split("T")[0];
        const threeDaysAhead = new Date(nowIST);
        threeDaysAhead.setDate(threeDaysAhead.getDate() + 3);
        const maxDate = threeDaysAhead.toISOString().split("T")[0];

        const { data } = await (supabase as any)
          .from("festival_dashakams")
          .select("festival_date, custom_message")
          .eq("is_active", true)
          .gte("festival_date", todayIST)
          .lte("festival_date", maxDate)
          .order("festival_date", { ascending: true })
          .limit(1);

        if (data && data.length > 0 && data[0].custom_message) {
          setFestivalMessage(data[0].custom_message);
        }
      } catch {
        // silent
      }
    }
    fetchFestival();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="Lord Mahavishnu at Guruvayur" className="h-full w-full object-contain object-top" />
          <div className="absolute inset-0 bg-gradient-to-b from-peacock-dark/80 via-peacock/60 to-background" />
        </div>
        <div className="relative container mx-auto px-4 py-20 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4 leading-tight">Sriman Narayaneeyam</h1>
            <p className="text-gold-light font-body text-lg md:text-xl max-w-2xl mx-auto mb-4">Your Gateway to Divine Grace</p>
            <p className="text-primary-foreground/80 font-sans text-sm md:text-base max-w-2xl mx-auto mb-4">
              A sacred journey through 100 Dashakams — chant, learn, and grow in devotion with the divine grace of Guruvayurappan
            </p>
            {festivalMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="font-sans text-sm md:text-base text-secondary font-semibold max-w-2xl mx-auto mb-4 text-center px-4 truncate"
              >
                {festivalMessage}
              </motion.p>
            )}
          </motion.div>
          {progress.lastSessionDate && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="inline-flex items-center gap-4 rounded-xl bg-card/90 backdrop-blur-sm px-6 py-4 shadow-gold">
              <div className="text-left">
                <p className="text-sm text-muted-foreground font-sans">Continue where you left off</p>
                <p className="font-display text-foreground font-semibold">Dashakam {progress.lastDashakam}, Verse {progress.lastParagraph}</p>
              </div>
              <div className="flex items-center gap-2 text-secondary">
                <Flame className="h-5 w-5" />
                <span className="font-display font-bold text-lg">{progress.currentStreak}</span>
              </div>
              <Link to={progress.lastPage || "/chant"} className="rounded-lg bg-gradient-gold px-4 py-2 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105">Resume</Link>
            </motion.div>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 -mt-4 relative z-20"><FestivalBanner /></section>

      <section className="container mx-auto px-4 -mt-4 relative z-10 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mainFeatures.map((f, i) => (
            <motion.div key={f.path} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
              <Link to={f.path} className="group block rounded-xl border border-border bg-card p-5 shadow-md transition-all hover:shadow-gold hover:-translate-y-1">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-peacock">
                  <f.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <h3 className="font-display text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-xs text-muted-foreground font-sans">{f.desc}</p>
              </Link>
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <button onClick={() => setShowMore(!showMore)} className="w-full text-left group block rounded-xl border border-border bg-card p-5 shadow-md transition-all hover:shadow-gold hover:-translate-y-1">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-peacock">
                <MoreHorizontal className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">More</h3>
              <p className="text-xs text-muted-foreground font-sans">Explore more features</p>
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {showMore && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moreFeatures.map((f, i) => (
                  <motion.div key={f.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Link to={f.path} className="group block rounded-xl border border-border bg-card p-5 shadow-md transition-all hover:shadow-gold hover:-translate-y-1">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-peacock">
                        <f.icon className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <h3 className="font-display text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                      <p className="text-xs text-muted-foreground font-sans">{f.desc}</p>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Verses Chanted", value: progress.completedVerses.length, icon: BookOpen },
            { label: "Streak Days", value: progress.currentStreak, icon: Flame },
            { label: "Minutes", value: progress.totalChantingMinutes, icon: Mic },
            { label: "Sessions", value: progress.totalSessions, icon: Headphones },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-gradient-peacock p-5 text-center">
              <stat.icon className="h-5 w-5 text-gold-light mx-auto mb-2" />
              <p className="font-display text-2xl font-bold text-primary-foreground">{stat.value}</p>
              <p className="text-xs text-primary-foreground/70 font-sans">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="rounded-xl border border-border bg-card overflow-hidden">
          <button onClick={() => setShowAbout(!showAbout)} className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">About Narayaneeyam</h2>
              <p className="text-sm text-muted-foreground font-sans mt-1">Your Gateway to Divine Grace</p>
            </div>
            {showAbout ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>
          <AnimatePresence>
            {showAbout && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-6 pb-6 space-y-6 font-sans text-foreground">
                  <div>
                    <h3 className="font-display text-lg font-semibold mb-2">Introduction</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      The Narayaneeyam, composed by the saint-poet Melpathur Narayana Bhattathiri, is a magnificent 1034-verse condensation of the Srimad Bhagavatam. It is not just a masterpiece of Sanskrit poetry; it is a powerful Anugraha Grantha—a book of blessings.
                    </p>
                  </div>
                  <div className="rounded-xl bg-gradient-peacock p-6 text-center">
                    <p className="font-display text-lg text-primary-foreground italic mb-2">"Agre Paśyāmi" — "I see Him before me."</p>
                    <p className="text-sm text-gold-light">Like Bhattathiri, may you find the vision of the Lord through these verses.</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>
    </div>
  );
}
