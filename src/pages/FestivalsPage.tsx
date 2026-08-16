import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, CalendarDays } from "lucide-react";
import SEO from "@/components/SEO";
import { getAllFestivals, type FestivalDashakam } from "@/lib/festivalDashakam";

function formatDate(d: string) {
  const dt = new Date(`${d}T00:00:00`);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDashakams(list: number[] = []) {
  if (!list || list.length === 0) return "—";
  const sorted = [...list].sort((a, b) => a - b);
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  if (sorted.length > 1 && contiguous) {
    return `Dashakams ${sorted[0]}–${sorted[sorted.length - 1]}`;
  }
  return `Dashakam${sorted.length > 1 ? "s" : ""} ${sorted.join(", ")}`;
}

function FestivalCard({ f }: { f: FestivalDashakam }) {
  const first = f.dashakam_list?.[0];
  return (
    <Link
      to={first ? `/chant?dashakam=${first}` : "/chant"}
      className="block rounded-2xl border border-border bg-card p-4 hover:border-secondary/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays className="h-4 w-4 text-secondary" />
        <span className="text-xs font-sans font-semibold uppercase tracking-wide text-secondary">
          {formatDate(f.festival_date)}
        </span>
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">{f.festival_name}</h3>
      <p className="text-sm font-sans font-medium text-primary mt-1">
        {formatDashakams(f.dashakam_list)}
      </p>
      {f.custom_message && (
        <p className="text-sm text-muted-foreground font-sans italic mt-2">{f.custom_message}</p>
      )}
    </Link>
  );
}

export default function FestivalsPage() {
  const [festivals, setFestivals] = useState<FestivalDashakam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAllFestivals().then((all) => {
      if (cancelled) return;
      setFestivals(
        [...all].sort((a, b) => a.festival_date.localeCompare(b.festival_date))
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = festivals.filter((f) => f.festival_date >= today);
  const past = festivals.filter((f) => f.festival_date < today).reverse();

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <SEO
        path="/festivals"
        title="Festival Parayanams — Sriman Narayaneeyam"
        description="Recommended Dashakams and their significance for each festival day in Sriman Narayaneeyam."
      />
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-secondary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Festival Parayanams</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6 font-sans">
        Recommended Dashakams for each sacred day
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground font-sans">Loading…</p>
      ) : (
        <>
          <div className="space-y-3">
            {upcoming.map((f) => (
              <FestivalCard key={f.id} f={f} />
            ))}
            {upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground font-sans text-center py-8">
                No upcoming festivals listed yet
              </p>
            )}
          </div>

          {past.length > 0 && (
            <div className="mt-8 border-t border-border pt-4">
              <button
                onClick={() => setShowPast((v) => !v)}
                className="text-sm font-sans text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPast ? "Hide" : "Show"} past festivals ({past.length})
              </button>
              {showPast && (
                <div className="space-y-3 mt-4 opacity-80">
                  {past.map((f) => (
                    <FestivalCard key={f.id} f={f} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
