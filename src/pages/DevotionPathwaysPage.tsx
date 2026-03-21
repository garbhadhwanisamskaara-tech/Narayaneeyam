import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Sparkles, Star, Calendar, Zap, ChevronRight, ArrowLeft,
  Mic, Headphones, CalendarDays, Loader2, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEVOTION_PATHWAYS, FESTIVAL_PATHWAYS, type DevotionPathway } from "@/data/devotionPathways";
import { sampleDashakams } from "@/data/narayaneeyam";
import PathwayDashakamList from "@/components/PathwayDashakamList";
import FestivalPathwaysList from "@/components/FestivalPathwaysList";
import HundredDayJourney from "@/components/HundredDayJourney";
import { useFestivalPathways, type FestivalItem } from "@/hooks/useFestivalPathways";

const iconMap: Record<string, React.ElementType> = {
  BookOpen, Sparkles, Star, Calendar, Zap,
};

function FestivalHighlight({ festival }: { festival: FestivalItem }) {
  const hasSingle = festival.dashakams.length === 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-secondary/30 bg-gradient-to-br from-card via-card to-secondary/5 p-6 mb-6 shadow-gold relative overflow-hidden"
    >
      <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-secondary" />
          <span className="text-sm font-sans font-semibold text-secondary tracking-wide uppercase">
            {festival.daysUntil === 0 ? "Today's Festival" : `Coming in ${festival.daysUntil} day${festival.daysUntil !== 1 ? "s" : ""}`}
          </span>
        </div>
        <h3 className="font-display text-xl font-bold text-foreground mb-1">{festival.festival_name}</h3>
        {festival.custom_message && (
          <p className="text-sm text-muted-foreground font-sans italic mb-3">{festival.custom_message}</p>
        )}
        <p className="text-sm text-foreground font-sans mb-4">
          Recommended Dashakam{festival.dashakams.length > 1 ? "s" : ""}:{" "}
          <span className="font-semibold text-primary">{festival.dashakams.map((d) => `D${d}`).join(", ")}</span>
        </p>
        {hasSingle ? (
          <div className="flex flex-wrap gap-3">
            <Link
              to={`/chant?dashakam=${festival.dashakams[0]}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-peacock px-5 py-2.5 text-sm font-sans font-semibold text-primary-foreground shadow-peacock hover:opacity-90 transition-opacity"
            >
              <Mic className="h-4 w-4" /> Chant
            </Link>
            <Link
              to={`/podcast?dashakam=${festival.dashakams[0]}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 text-sm font-sans font-semibold text-primary shadow-gold hover:opacity-90 transition-opacity"
            >
              <Headphones className="h-4 w-4" /> Listen
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {festival.dashakams.map((d) => (
              <div key={d} className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="font-display text-sm font-semibold text-foreground mb-2">Dashakam {d}</p>
                <div className="flex justify-center gap-2">
                  <Link to={`/chant?dashakam=${d}`} className="inline-flex items-center gap-1 rounded-lg bg-gradient-peacock px-3 py-1.5 text-xs font-sans font-semibold text-primary-foreground">
                    <Mic className="h-3 w-3" /> Chant
                  </Link>
                  <Link to={`/podcast?dashakam=${d}`} className="inline-flex items-center gap-1 rounded-lg bg-gradient-gold px-3 py-1.5 text-xs font-sans font-semibold text-primary">
                    <Headphones className="h-3 w-3" /> Listen
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function UpcomingTimeline({ festivals }: { festivals: FestivalItem[] }) {
  if (festivals.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-xl border border-border bg-card p-5 mb-6"
    >
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-secondary" />
        Upcoming Festivals
      </h3>
      <div className="space-y-3">
        {festivals.map((f, i) => (
          <div key={f.id} className="flex items-center gap-4">
            <div className="flex flex-col items-center w-12 shrink-0">
              <span className="text-xs font-sans text-muted-foreground">
                {new Date(f.festival_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground font-sans truncate">{f.festival_name}</p>
              <p className="text-xs text-muted-foreground font-sans flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {f.daysUntil} day{f.daysUntil !== 1 ? "s" : ""} away · D{f.dashakams.join(", D")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function DevotionPathwaysPage() {
  const [selectedPathway, setSelectedPathway] = useState<DevotionPathway | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<string | null>(null);
  const navigate = useNavigate();

  const { todayFestival, upcomingFestivals, allFestivals, loading: festivalsLoading } = useFestivalPathways();

  const activePathways = DEVOTION_PATHWAYS.filter((p) => p.active).sort(
    (a, b) => a.display_order - b.display_order
  );

  const handlePathwayClick = (pathway: DevotionPathway) => {
    if (pathway.type === "festival") {
      setSelectedPathway(pathway);
      setSelectedFestival(null);
    } else {
      setSelectedPathway(pathway);
    }
  };

  const handleBack = () => {
    if (selectedFestival) {
      setSelectedFestival(null);
    } else {
      setSelectedPathway(null);
    }
  };

  const handleDashakamClick = (dashakamNumber: number) => {
    navigate(`/chant?dashakam=${dashakamNumber}`);
  };

  // ─── Festival sub-view (from DB festivals) ────────────────
  if (selectedPathway?.type === "festival" && !selectedFestival) {
    // Build festival list from DB data merged with static
    const dbFestivalPathways = allFestivals
      .filter((f) => f.daysUntil >= 0)
      .map((f) => ({
        id: f.id,
        festival_name: `${f.festival_name} — ${new Date(f.festival_date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        dashakams: f.dashakams,
      }));

    const festivalList = dbFestivalPathways.length > 0 ? dbFestivalPathways : FESTIVAL_PATHWAYS;

    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pathways
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">Festival Pathways</h1>
        <FestivalPathwaysList
          festivals={festivalList}
          onSelect={(festivalId) => setSelectedFestival(festivalId)}
        />
      </div>
    );
  }

  // ─── Festival dashakam list ────────────────────────────────
  if (selectedPathway?.type === "festival" && selectedFestival) {
    const dbFest = allFestivals.find((f) => f.id === selectedFestival);
    const staticFest = FESTIVAL_PATHWAYS.find((f) => f.id === selectedFestival);
    const festName = dbFest?.festival_name || staticFest?.festival_name || "Festival";
    const festDashakams = dbFest?.dashakams || staticFest?.dashakams || [];

    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Festivals
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">{festName}</h1>
        <p className="text-sm text-muted-foreground mb-6 font-sans">
          {festDashakams.length} Dashakam{festDashakams.length > 1 ? "s" : ""} recommended
        </p>
        <PathwayDashakamList
          dashakams={festDashakams}
          allDashakams={sampleDashakams}
          onSelect={handleDashakamClick}
        />
      </div>
    );
  }

  // ─── 100-Day Journey ───────────────────────────────────────
  if (selectedPathway?.type === "journey") {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pathways
        </button>
        <HundredDayJourney allDashakams={sampleDashakams} onDashakamClick={handleDashakamClick} />
      </div>
    );
  }

  // ─── Standard pathway dashakam list ────────────────────────
  if (selectedPathway) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pathways
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">{selectedPathway.name}</h1>
        <p className="text-sm text-muted-foreground mb-6 font-sans">
          {selectedPathway.description} · {selectedPathway.dashakams.length} Dashakams
        </p>
        <PathwayDashakamList
          dashakams={selectedPathway.dashakams}
          allDashakams={sampleDashakams}
          onSelect={handleDashakamClick}
        />
      </div>
    );
  }

  // ─── Main view: pathway cards + festival highlights ────────
  const nextFestival = !todayFestival && upcomingFestivals.length > 0 ? upcomingFestivals[0] : null;

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Devotion Pathways</h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">Structured devotional chanting journeys</p>

      {/* Today's festival */}
      {todayFestival && <FestivalHighlight festival={todayFestival} />}

      {/* Next upcoming if no festival today */}
      {!todayFestival && nextFestival && <FestivalHighlight festival={nextFestival} />}

      {/* Upcoming timeline */}
      <UpcomingTimeline festivals={todayFestival ? upcomingFestivals : upcomingFestivals.slice(1)} />

      {/* Pathway cards */}
      <div className="grid gap-4">
        {activePathways.map((pathway, idx) => {
          const IconComp = iconMap[pathway.icon] || BookOpen;
          return (
            <motion.div
              key={pathway.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow border-border"
                onClick={() => handlePathwayClick(pathway)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <IconComp className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-base font-semibold text-foreground">{pathway.name}</h3>
                    <p className="text-sm text-muted-foreground font-sans truncate">{pathway.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
