import { useState } from "react";
import { Feather as FeatherIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useFeathers, type FeatherMode } from "@/hooks/useFeathers";
import { getDashakamName } from "@/hooks/useDashakam";

const MODES: { key: FeatherMode; label: string; color: string; ring: string; bg: string }[] = [
  { key: "chant", label: "Chant", color: "text-feather-chant", ring: "border-feather-chant/40", bg: "bg-feather-chant/15" },
  { key: "learn", label: "Learn", color: "text-feather-learn", ring: "border-feather-learn/40", bg: "bg-feather-learn/15" },
  { key: "podcast", label: "Podcast", color: "text-feather-podcast", ring: "border-feather-podcast/40", bg: "bg-feather-podcast/15" },
];

export default function FeatherShelf() {
  const { feathers, loading } = useFeathers();
  const [mode, setMode] = useState<FeatherMode>("chant");

  const active = MODES.find((m) => m.key === mode)!;
  const collected = new Set(feathers.filter((f) => f.mode === mode).map((f) => f.dashakam_no));
  const pct = Math.round((collected.size / 100) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <FeatherIcon className={`h-5 w-5 ${active.color}`} />
            Feather Shelf
          </h2>
          <p className="text-sm text-muted-foreground font-sans">
            {loading ? "Gathering your feathers…" : `${collected.size} of 100 feathers collected in ${active.label}`}
          </p>
        </div>
        <div className="flex gap-2">
          {MODES.map((m) => {
            const count = new Set(feathers.filter((f) => f.mode === m.key).map((f) => f.dashakam_no)).size;
            const isActive = m.key === mode;
            return (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-sans font-semibold transition-all ${
                  isActive ? `${m.bg} ${m.ring} ${m.color}` : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <FeatherIcon className={`h-3.5 w-3.5 ${isActive ? m.color : ""}`} />
                {m.label} · {count}
              </button>
            );
          })}
        </div>
      </div>

      <Progress value={pct} className="mb-5 h-3" />

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
        {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
          const has = collected.has(num);
          return (
            <div
              key={num}
              title={`${num}. ${getDashakamName(num)}`}
              className={`relative aspect-square rounded-lg text-xs font-sans font-semibold flex items-center justify-center border transition-all ${
                has
                  ? `${active.bg} ${active.ring}`
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {has ? <FeatherIcon className={`h-4 w-4 ${active.color}`} /> : num}
            </div>
          );
        })}
      </div>
    </div>
  );
}
