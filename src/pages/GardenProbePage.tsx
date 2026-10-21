import { useEffect, useState } from "react";
import DashakamGarden from "@/components/DashakamGarden";

// TEMPORARY verification probe — removed after the loading-state check.
export default function GardenProbePage() {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  const occurrences = [
    { key: "k41", dashakamNo: 41, scheduledDate: "2026-10-19" },
    { key: "k42", dashakamNo: 42, scheduledDate: "2026-10-20" },
    { key: "k43", dashakamNo: 43, scheduledDate: "2026-10-21" },
    { key: "k44", dashakamNo: 44, scheduledDate: "2026-10-22" },
  ];
  const tiles = new Map(
    occurrences.map((o, i) => [o.key, { done: i === 0 ? 1 : 0, total: 1, canTap: true, scheduled_date: o.scheduledDate }]),
  );
  const blooms = new Map([["k41", 100]]);

  return (
    <div className="p-6">
      <DashakamGarden
        blooms={blooms}
        occurrences={occurrences}
        tiles={tiles}
        onTapDashakam={() => {}}
        loading={loading}
        title="Probe Garden"
      />
    </div>
  );
}
