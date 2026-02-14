import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye } from "lucide-react";
import { sampleDashakams, LANGUAGES, type Language } from "@/data/narayaneeyam";

export default function ScriptPage() {
  const [selectedDashakam, setSelectedDashakam] = useState(1);
  const [viewMode, setViewMode] = useState<"full" | "para">("full");
  const [language, setLanguage] = useState<Language>("sanskrit");
  const [selectedPara, setSelectedPara] = useState<number | null>(null);

  const dashakam = sampleDashakams.find((d) => d.id === selectedDashakam);
  const verses = dashakam?.verses || [];
  const displayVerses =
    viewMode === "para" && selectedPara
      ? verses.filter((v) => v.paragraph === selectedPara)
      : verses;

  const getVerseText = (verse: typeof verses[0], lang: Language) => {
    return verse[lang] || verse.sanskrit;
  };

  const handleDownload = () => {
    const text = displayVerses
      .map(
        (v, i) =>
          `Verse ${v.paragraph}\n${getVerseText(v, language)}\n`
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashakam-${selectedDashakam}-${language}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Script Library</h1>
          <p className="text-muted-foreground font-sans">
            View and download slokas in your preferred language
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-6 rounded-xl bg-card border border-border p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">Dashakam</label>
            <select
              value={selectedDashakam}
              onChange={(e) => {
                setSelectedDashakam(Number(e.target.value));
                setSelectedPara(null);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            >
              {sampleDashakams.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id}. {d.title_english}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-sans">View Mode</label>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("full")}
                className={`px-3 py-2 text-sm font-sans ${
                  viewMode === "full" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                Full Dashakam
              </button>
              <button
                onClick={() => setViewMode("para")}
                className={`px-3 py-2 text-sm font-sans ${
                  viewMode === "para" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                }`}
              >
                Para-wise
              </button>
            </div>
          </div>

          {viewMode === "para" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground font-sans">Paragraph</label>
              <select
                value={selectedPara || ""}
                onChange={(e) => setSelectedPara(Number(e.target.value))}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
              >
                <option value="">Select...</option>
                {verses.map((v) => (
                  <option key={v.paragraph} value={v.paragraph}>
                    Para {v.paragraph}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1 justify-end ml-auto">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 text-sm font-sans font-semibold text-primary shadow-gold hover:scale-105 transition-transform"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>

        {/* Dashakam Title */}
        {dashakam && (
          <div className="mb-6 rounded-xl bg-gradient-peacock p-5">
            <h2 className="font-display text-xl font-semibold text-primary-foreground">
              {dashakam.title_sanskrit}
            </h2>
            <p className="text-gold-light font-sans text-sm">{dashakam.title_english}</p>
          </div>
        )}

        {/* Verses Display */}
        <div className="space-y-4">
          {displayVerses.length === 0 ? (
            <div className="rounded-xl bg-card border border-border p-8 text-center">
              <p className="text-muted-foreground font-sans">
                No content available for this selection. Admin needs to upload verse data.
              </p>
            </div>
          ) : (
            displayVerses.map((verse, idx) => (
              <motion.div
                key={verse.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground font-sans">
                    Verse {verse.paragraph} · Meter: {verse.meter}
                  </span>
                </div>
                <p className="font-body text-lg leading-relaxed whitespace-pre-line text-foreground">
                  {getVerseText(verse, language)}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
