import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Bell, Sparkles } from "lucide-react";
import { useFestivalPathways, type FestivalItem } from "@/hooks/useFestivalPathways";

const NOTIFIED_KEY = "festival_notified";

function alreadyNotified(id: string) {
  try {
    return (JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]") as string[]).includes(id);
  } catch {
    return false;
  }
}

function markNotified(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]") as string[];
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...list, id]));
  } catch {
    /* ignore */
  }
}

async function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/placeholder.svg" });
    else new Notification(title, { body });
  } catch {
    /* ignore */
  }
}

export default function FestivalReminder() {
  const { todayFestival, upcomingFestivals, loading } = useFestivalPathways();

  // Day-before push notification (sent once per festival).
  const dayBefore: FestivalItem | undefined = upcomingFestivals.find((f) => f.daysUntil === 1);

  useEffect(() => {
    if (!dayBefore) return;
    const key = `${dayBefore.id}-day-before`;
    if (alreadyNotified(key)) return;
    markNotified(key);
    void notify(
      `${dayBefore.festival_name} is tomorrow`,
      `Prepare for tomorrow's parayanam — Dashakam ${dayBefore.dashakams.join(", ")}.`,
    );
  }, [dayBefore?.id]);

  if (loading) return null;

  // On the day — "have you read?"
  if (todayFestival) {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm font-sans text-foreground">
        <Sparkles className="h-4 w-4 text-secondary" />
        <span>
          Today is {todayFestival.festival_name} — have you read Dashakam{" "}
          {todayFestival.dashakams.join(", ")}?
        </span>
        <Link
          to={`/chant?dashakam=${todayFestival.dashakams[0] ?? 1}`}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
        >
          Read now
        </Link>
      </div>
    );
  }

  // 4 days (or fewer) before — gentle in-app alert.
  const upcoming = upcomingFestivals.find((f) => f.daysUntil > 0 && f.daysUntil <= 4);
  if (!upcoming) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-secondary/30 bg-card px-4 py-3 text-sm font-sans text-foreground">
      <Bell className="h-4 w-4 text-secondary" />
      <span>
        {upcoming.festival_name} is in {upcoming.daysUntil} {upcoming.daysUntil === 1 ? "day" : "days"} — Dashakam{" "}
        {upcoming.dashakams.join(", ")}.
      </span>
      <Link
        to={`/chant?dashakam=${upcoming.dashakams[0] ?? 1}`}
        className="rounded-md border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
      >
        Prepare
      </Link>
    </div>
  );
}
