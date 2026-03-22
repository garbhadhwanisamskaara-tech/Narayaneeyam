import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { captureAppError } from "@/monitoring/sentry";
import { useAuth } from "@/contexts/AuthContext";
import { getProgress, saveProgress } from "@/lib/progress";

export interface CompletedDashakam {
  dashakam_no: number;
  completed_date: string;
  pathway_id: string;
}

interface UserProgressData {
  completedDashakams: CompletedDashakam[];
  dashakamsCompleted: number;
  lastActivity: string | null;
  currentStreak: number;
  totalDashakams: number;
  completionPercentage: number;
  markComplete: (dashakamNo: number, pathwayId?: string) => Promise<void>;
  loading: boolean;
  isGuest: boolean;
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Streak must include today or yesterday
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 0; i < unique.length - 1; i++) {
    const curr = new Date(unique[i]);
    const prev = new Date(unique[i + 1]);
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function useUserProgress(): UserProgressData {
  const { user } = useAuth();
  const [completedDashakams, setCompletedDashakams] = useState<CompletedDashakam[]>([]);
  const [loading, setLoading] = useState(true);

  const isGuest = !user;

  // Fetch from Supabase or localStorage
  useEffect(() => {
    if (isGuest) {
      // Fall back to localStorage
      const local = getProgress();
      const localCompleted: CompletedDashakam[] = (local.completedDashakams || []).map((d) => ({
        dashakam_no: d,
        completed_date: local.lastSessionDate || new Date().toISOString().split("T")[0],
        pathway_id: "100-day-journey",
      }));
      setCompletedDashakams(localCompleted);
      setLoading(false);
      return;
    }

    async function fetchProgress() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("user_progress")
          .select("dashakam_no, completed_date, pathway_id")
          .order("completed_date", { ascending: false });

        if (error) throw error;
        setCompletedDashakams(
          (data || []).map((r: any) => ({
            dashakam_no: r.dashakam_no,
            completed_date: r.completed_date,
            pathway_id: r.pathway_id || "100-day-journey",
          }))
        );
      } catch {
        // Fall back to localStorage on error
        const local = getProgress();
        const localCompleted: CompletedDashakam[] = (local.completedDashakams || []).map((d) => ({
          dashakam_no: d,
          completed_date: local.lastSessionDate || new Date().toISOString().split("T")[0],
          pathway_id: "100-day-journey",
        }));
        setCompletedDashakams(localCompleted);
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();
  }, [user, isGuest]);

  const dashakamsCompleted = new Set(completedDashakams.map((c) => c.dashakam_no)).size;
  const lastActivity = completedDashakams.length > 0 ? completedDashakams[0].completed_date : null;
  const currentStreak = calculateStreak(completedDashakams.map((c) => c.completed_date));
  const completionPercentage = Math.round((dashakamsCompleted / 100) * 100);

  const markComplete = useCallback(
    async (dashakamNo: number, pathwayId = "100-day-journey") => {
      const today = new Date().toISOString().split("T")[0];

      if (isGuest) {
        // Save to localStorage
        const local = getProgress();
        const completed = local.completedDashakams || [];
        if (!completed.includes(dashakamNo)) {
          completed.push(dashakamNo);
          saveProgress({ completedDashakams: completed, lastSessionDate: today });
        }
        setCompletedDashakams((prev) => [
          { dashakam_no: dashakamNo, completed_date: today, pathway_id: pathwayId },
          ...prev,
        ]);
        return;
      }

      try {
        const { error } = await supabase.from("user_progress").upsert(
          {
            user_id: user!.id,
            pathway_id: pathwayId,
            dashakam_no: dashakamNo,
            completed_date: today,
          },
          { onConflict: "user_id,pathway_id,dashakam_no" }
        );
        if (error) throw error;
        setCompletedDashakams((prev) => [
          { dashakam_no: dashakamNo, completed_date: today, pathway_id: pathwayId },
          ...prev.filter((c) => !(c.dashakam_no === dashakamNo && c.pathway_id === pathwayId)),
        ]);
      } catch {
        // Silent fail — localStorage fallback
        const local = getProgress();
        const completed = local.completedDashakams || [];
        if (!completed.includes(dashakamNo)) {
          completed.push(dashakamNo);
          saveProgress({ completedDashakams: completed, lastSessionDate: today });
        }
      }
    },
    [user, isGuest]
  );

  return {
    completedDashakams,
    dashakamsCompleted,
    lastActivity,
    currentStreak,
    totalDashakams: 100,
    completionPercentage,
    markComplete,
    loading,
    isGuest,
  };
}
