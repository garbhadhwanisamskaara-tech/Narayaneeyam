import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen, Sparkles, Star, Calendar, Zap, ChevronRight, ArrowLeft, Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { type DevotionPathway } from "@/data/devotionPathways";
import PathwayDashakamList from "@/components/PathwayDashakamList";
import { useParayanamTemplates } from "@/hooks/useParayanamTemplates";
import SEO from "@/components/SEO";

const iconMap: Record<string, React.ElementType> = {
  BookOpen, Sparkles, Star, Calendar, Zap,
};

export default function DevotionPathwaysPage() {
  const [selectedPathway, setSelectedPathway] = useState<DevotionPathway | null>(null);
  const navigate = useNavigate();

  const { templates, loading: templatesLoading } = useParayanamTemplates();

  const iconOptions = Object.keys(iconMap);

  const activePathways: DevotionPathway[] = templates
    .map((t, idx) => ({
      id: t.id,
      name: t.template_name,
      description: t.description ?? "",
      dashakams: t.dashakam_list,
      icon: iconOptions[idx % iconOptions.length],
      display_order: t.sort_order ?? idx,
      active: true,
      type: "standard" as const,
    }))
    .sort((a, b) => a.display_order - b.display_order);

  const handleBack = () => setSelectedPathway(null);

  const handleDashakamClick = (dashakamNumber: number) => {
    navigate(`/chant?dashakam=${dashakamNumber}`);
  };

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
          onSelect={handleDashakamClick}
        />
      </div>
    );
  }

  // ─── Main view: template pathway cards only ────────
  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <SEO path="/devotion-pathways" title="Devotion Pathways — Sriman Narayaneeyam" description="Predefined parayanam templates for structured chanting." />
      <h1 className="font-display text-2xl font-bold text-foreground mb-2">Devotion Pathways</h1>
      <p className="text-sm text-muted-foreground mb-6 font-sans">Structured devotional chanting journeys</p>

      {templatesLoading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-sans">Loading pathways…</span>
        </div>
      )}

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
                onClick={() => setSelectedPathway(pathway)}
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
