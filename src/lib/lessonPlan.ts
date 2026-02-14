export interface LessonPlan {
  id: string;
  startDate: string;
  classesPerWeek: number;
  vacationDays: string[];
  minutesPerClass: number;
  language: string;
  dashakamStart: number;
  dashakamEnd: number;
  createdAt: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  date: string;
  dashakam: number;
  paragraphs: number[];
  completed: boolean;
  completedAt?: string;
}

const LESSON_PLAN_KEY = "narayaneeyam_lesson_plans";

export function getLessonPlans(): LessonPlan[] {
  try {
    const stored = localStorage.getItem(LESSON_PLAN_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

export function saveLessonPlan(plan: LessonPlan) {
  const plans = getLessonPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.push(plan);
  localStorage.setItem(LESSON_PLAN_KEY, JSON.stringify(plans));
  return plans;
}

export function deleteLessonPlan(id: string) {
  const plans = getLessonPlans().filter((p) => p.id !== id);
  localStorage.setItem(LESSON_PLAN_KEY, JSON.stringify(plans));
  return plans;
}

export function generateLessons(
  startDate: string,
  classesPerWeek: number,
  vacationDays: string[],
  minutesPerClass: number,
  dashakamStart: number,
  dashakamEnd: number
): Lesson[] {
  const lessons: Lesson[] = [];
  let currentDate = new Date(startDate);
  let lessonsThisWeek = 0;
  let weekStart = new Date(startDate);
  let dashakam = dashakamStart;
  let para = 1;
  const versesPerLesson = Math.max(1, Math.floor(minutesPerClass / 5)); // ~5 min per verse

  while (dashakam <= dashakamEnd) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const dayOfWeek = currentDate.getDay();

    // Skip weekends and vacation days
    if (dayOfWeek !== 0 && !vacationDays.includes(dateStr)) {
      if (lessonsThisWeek < classesPerWeek) {
        const paragraphs: number[] = [];
        for (let i = 0; i < versesPerLesson && para <= 10; i++) {
          paragraphs.push(para);
          para++;
        }

        if (paragraphs.length > 0) {
          lessons.push({
            id: `lesson-${dashakam}-${paragraphs[0]}`,
            date: dateStr,
            dashakam,
            paragraphs,
            completed: false,
          });
        }

        if (para > 10) {
          para = 1;
          dashakam++;
        }
        lessonsThisWeek++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);

    // Reset weekly counter
    if (currentDate.getTime() - weekStart.getTime() >= 7 * 86400000) {
      weekStart = new Date(currentDate);
      lessonsThisWeek = 0;
    }
  }

  return lessons;
}
