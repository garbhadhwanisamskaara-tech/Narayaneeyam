import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, Star, Calendar, Zap, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DEVOTION_PATHWAYS, FESTIVAL_PATHWAYS, type DevotionPathway } from "@/data/devotionPathways";
import { sampleDashakams } from "@/data/narayaneeyam";
import PathwayDashakamList from "@/components/PathwayDashakamList";
import FestivalPathwaysList from "@/components/FestivalPathwaysList";
import HundredDayJourney from "@/components/HundredDayJourney";

const iconMap: Record<string, React.ElementType> = {
  BookOpen,
  Sparkles,
  Star,
  Calendar,
  Zap,
};

export default function DevotionPathwaysPage() {
  const [selectedPathway, setSelectedPathway] = useState<DevotionPathway | null>(null);
  const [selectedFestival, setSelectedFestival] = useState<string | null>(null);
  const navigate = useNavigate();

  const activePathways = DEVOTION_PATHWAYS.filter((p) => p.active).sort(
    (a, b) => a.display_order - b.display_order
  );

  // Handle pathway card click
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

  // ─── Festival sub-view ─────────────────────────────────────
  if (selectedPathway?.type === "festival" && !selectedFestival) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Pathways
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-6">
          Festival Pathways
        </h1>
        <FestivalPathwaysList
          festivals={FESTIVAL_PATHWAYS}
          onSelect={(festivalId) => setSelectedFestival(festivalId)}
        />
      </div>
    );
  }

  // ─── Festival dashakam list ────────────────────────────────
  if (selectedPathway?.type === "festival" && selectedFestival) {
    const festival = FESTIVAL_PATHWAYS.find((f) => f.id === selectedFestival);
    if (!festival) return null;
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-sm font-sans text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Festivals
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {festival.festival_name}
        </h1>
        <p className="text-sm text-muted-foreground mb-6 font-sans">
          {festival.dashakams.length} Dashakam{festival.dashakams.length > 1 ? "s" : ""} recommended
        </p>
        <PathwayDashakamList
          dashakams={festival.dashakams}
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
        <HundredDayJourney
          allDashakams={sampleDashakams}
          onDashakamClick={handleDashakamClick}
        />
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
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          {selectedPathway.name}
        </h1>
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

  // ─── Pathway cards grid ────────────────────────────────────
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">
        Devotion Pathways
      </h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Structured devotional chanting journeys
      </p>
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
                    <h3 className="font-display text-base font-semibold text-foreground">
                      {pathway.name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-sans truncate">
                      {pathway.description}
                    </p>
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
