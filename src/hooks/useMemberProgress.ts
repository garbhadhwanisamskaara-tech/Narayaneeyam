import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { getDashakamName } from "@/hooks/useDashakam";

export interface VerseStatus {
  verse_number: number;
  completed: boolean;
}

export interface LastPosition {
  dashakam_number: number;
  verse_number: number;
  dashakam_name: string;
}

export function useMemberProgress(mode: "chant" | "learn") {
  const { user } = useAuth();
  const [lastPosition, setLastPosition] = useState<LastPosition | null>(null);
  const [verseStatuses, setVerseStatuses] = useState<Map<string, boolean>>(new Map());
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const completionToastShown = useRef<Set<number>>(new Set());

  // Fetch last position on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function fetchLastPosition() {
      try {
        const { data } = await (supabase as any)
          .from("member_progress")
          .select("dashakam_number, verse_number")
          .eq("user_id", user!.id)
          .eq("mode", mode)
          .order("last_accessed", { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const d = data[0];
          const dashakamName = getDashakamName(d.dashakam_number);
          setLastPosition({
            dashakam_number: d.dashakam_number,
            verse_number: d.verse_number,
            dashakam_name: dashakamName,
          });
        }
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchLastPosition();
  }, [user, mode]);

  // Fetch verse statuses for a dashakam
  const fetchVerseStatuses = useCallback(
    async (dashakamNo: number) => {
      if (!user) return;
      try {
        const { data } = await (supabase as any)
          .from("member_progress")
          .select("verse_number, completed")
          .eq("user_id", user.id)
          .eq("dashakam_number", dashakamNo)
          .eq("mode", mode);

        const map = new Map<string, boolean>();
        if (data) {
          for (const row of data) {
            map.set(`${dashakamNo}-${row.verse_number}`, row.completed === true);
          }
        }
        setVerseStatuses(map);
      } catch {
        // silent fail
      }
    },
    [user, mode]
  );

  // Save verse started
  const markVerseStarted = useCallback(
    async (dashakamNo: number, verseNo: number) => {
      if (!user) return;
      try {
        await (supabase as any).from("member_progress").upsert(
          {
            user_id: user.id,
            dashakam_number: dashakamNo,
            verse_number: verseNo,
            completed: false,
            last_accessed: new Date().toISOString(),
            mode,
          },
          { onConflict: "user_id,dashakam_number,verse_number,mode" }
        );
        setVerseStatuses((prev) => {
          const next = new Map(prev);
          if (!next.has(`${dashakamNo}-${verseNo}`)) {
            next.set(`${dashakamNo}-${verseNo}`, false);
          }
          return next;
        });
      } catch {
        // silent fail
      }
    },
    [user, mode]
  );

  // Mark verse completed
  const markVerseFinished = useCallback(
    async (dashakamNo: number, verseNo: number) => {
      if (!user) return;
      try {
        await (supabase as any).from("member_progress").upsert(
          {
            user_id: user.id,
            dashakam_number: dashakamNo,
            verse_number: verseNo,
            completed: true,
            last_accessed: new Date().toISOString(),
            mode,
          },
          { onConflict: "user_id,dashakam_number,verse_number,mode" }
        );
        setVerseStatuses((prev) => {
          const next = new Map(prev);
          next.set(`${dashakamNo}-${verseNo}`, true);
          return next;
        });
      } catch {
        // silent fail
      }
    },
    [user, mode]
  );

  // Check dashakam completion
  const checkDashakamCompletion = useCallback(
    async (dashakamNo: number, totalVerses: number) => {
      if (!user || totalVerses === 0) return;
      if (completionToastShown.current.has(dashakamNo)) return;

      // Count completed verses from local state
      let completedCount = 0;
      for (let v = 1; v <= totalVerses; v++) {
        if (verseStatuses.get(`${dashakamNo}-${v}`) === true) {
          completedCount++;
        }
      }

      if (completedCount >= totalVerses) {
        completionToastShown.current.add(dashakamNo);
        const name = getDashakamName(dashakamNo);

        toast({
          title: `🙏 Dashakam ${dashakamNo} complete!`,
          description: `${name} — well done.`,
        });

        // Update user_progress table for streak tracking
        try {
          const today = new Date().toISOString().split("T")[0];
          await (supabase as any).from("user_progress").upsert(
            {
              user_id: user.id,
              pathway_id: mode,
              dashakam_no: dashakamNo,
              completed_date: today,
            },
            { onConflict: "user_id,pathway_id,dashakam_no", ignoreDuplicates: true }
          );
        } catch {
          // silent fail
        }
      }
    },
    [user, mode, verseStatuses]
  );

  const getVerseStatus = useCallback(
    (dashakamNo: number, verseNo: number): "completed" | "started" | "none" => {
      const key = `${dashakamNo}-${verseNo}`;
      if (!verseStatuses.has(key)) return "none";
      return verseStatuses.get(key) ? "completed" : "started";
    },
    [verseStatuses]
  );

  const dismissBanner = useCallback(() => setBannerDismissed(true), []);

  return {
    lastPosition: bannerDismissed ? null : lastPosition,
    loading,
    fetchVerseStatuses,
    markVerseStarted,
    markVerseFinished,
    checkDashakamCompletion,
    getVerseStatus,
    dismissBanner,
    isGuest: !user,
  };
}
