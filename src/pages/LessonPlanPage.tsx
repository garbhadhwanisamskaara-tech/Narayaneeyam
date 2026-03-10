import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Calendar, CheckCircle2 } from "lucide-react";
import {
  getLessonPlans,
  saveLessonPlan,
  deleteLessonPlan,
  generateLessons,
  type LessonPlan,
  type Lesson,
} from "@/lib/lessonPlan";
import {
  getLessonPlansFromDB,
  saveLessonPlanToDB,
  deleteLessonPlanFromDB,
  completeLessonAndAdvance,
} from "@/lib/supabaseProgress";
import { supabase } from "@/integrations/supabase/client";
import { LANGUAGES } from "@/data/narayaneeyam";
import { useToast } from "@/hooks/use-toast";

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onDelete,
  onCompleteLesson,
  isLoggedIn,
}: {
  plan: LessonPlan;
  onDelete: (id: string) => void;
  onCompleteLesson: (planId: string, lessonIdx: number) => void;
  isLoggedIn: boolean;
}) {
  const completed = plan.lessons.filter((l) => l.completed).length;
  const progress = plan.lessons.length > 0 ? (completed / plan.lessons.length) * 100 : 0;

  // Find the current active lesson (first incomplete)
  const activeLessonIdx = plan.lessons.findIndex((l) => !l.completed);
  const activeLesson: Lesson | undefined = activeLessonIdx >= 0 ? plan.lessons[activeLessonIdx] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Dashakam {plan.dashakamStart} — {plan.dashakamEnd}
          </h3>
          <p className="text-sm text-muted-foreground font-sans">
            {plan.lessons.length} lessons · {plan.classesPerWeek}×/week · {plan.minutesPerClass} min/class
          </p>
          <p className="text-xs text-muted-foreground font-sans mt-1">
            Starts: {plan.startDate} · Language: {plan.language}
          </p>
        </div>
        <button
          onClick={() => onDelete(plan.id)}
          className="text-muted-foreground hover:text-destructive p-2 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-gold transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 mb-4">
        <span className="text-xs text-muted-foreground font-sans">
          {completed} / {plan.lessons.length} completed
        </span>
        <span className="text-xs font-semibold text-secondary font-sans">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Active lesson card */}
      {activeLesson && (
        <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-secondary font-sans uppercase tracking-wide">
              Next Session
            </span>
            <span className="text-xs text-muted-foreground font-sans">{activeLesson.date}</span>
          </div>
          <p className="text-sm text-foreground font-sans mb-3">
            Dashakam {activeLesson.dashakam} · Verses {activeLesson.paragraphs.join(", ")}
          </p>
          {isLoggedIn && (
            <button
              onClick={() => onCompleteLesson(plan.id, activeLessonIdx)}
              className="flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2 text-sm font-sans font-semibold text-primary shadow-gold transition-transform hover:scale-105"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Session Complete
            </button>
          )}
        </div>
      )}

      {/* All lessons done */}
      {activeLessonIdx === -1 && plan.lessons.length > 0 && (
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
          <p className="text-sm font-semibold text-primary font-sans">🎉 All sessions completed!</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Create Form ───────────────────────────────────────────────────────────────

function CreatePlanForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (params: {
    startDate: string;
    classesPerWeek: number;
    minutesPerClass: number;
    dashakamStart: number;
    dashakamEnd: number;
    language: string;
  }) => void;
  onCancel: () => void;
}) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [classesPerWeek, setClassesPerWeek] = useState(3);
  const [minutesPerClass, setMinutesPerClass] = useState(30);
  const [dashakamStart, setDashakamStart] = useState(1);
  const [dashakamEnd, setDashakamEnd] = useState(10);
  const [language, setLanguage] = useState("english");

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 mb-8"
    >
      <h3 className="font-display text-lg font-semibold text-foreground mb-4">
        Create New Lesson Plan
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Start Date", type: "date", value: startDate, set: setStartDate },
        ].map(({ label, type, value, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground font-sans">{label}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => set(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            />
          </div>
        ))}
        {[
          { label: "Classes per Week", value: classesPerWeek, set: setClassesPerWeek, min: 1, max: 7 },
          { label: "Minutes per Class", value: minutesPerClass, set: setMinutesPerClass, min: 10, max: 120 },
          { label: "From Dashakam", value: dashakamStart, set: setDashakamStart, min: 1, max: 100 },
          { label: "To Dashakam", value: dashakamEnd, set: setDashakamEnd, min: 1, max: 100 },
        ].map(({ label, value, set, min, max }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-sm text-muted-foreground font-sans">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              value={value}
              onChange={(e) => set(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label className="text-sm text-muted-foreground font-sans">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => onSubmit({ startDate, classesPerWeek, minutesPerClass, dashakamStart, dashakamEnd, language })}
          className="rounded-lg bg-primary px-6 py-2.5 font-sans font-semibold text-primary-foreground shadow-peacock transition-transform hover:scale-105"
        >
          Create Plan
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-border px-6 py-2.5 font-sans text-foreground hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LessonPlanPage() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsLoggedIn(!!user);
      });
    }
    setPlans(getLessonPlans());
  }, []);

  const handleCreate = async ({
    startDate,
    classesPerWeek,
    minutesPerClass,
    dashakamStart,
    dashakamEnd,
    language,
  }: {
    startDate: string;
    classesPerWeek: number;
    minutesPerClass: number;
    dashakamStart: number;
    dashakamEnd: number;
    language: string;
  }) => {
    if (dashakamEnd < dashakamStart) {
      toast({ title: "Invalid range", description: "End dashakam must be >= start", variant: "destructive" });
      return;
    }

    const lessons = generateLessons(startDate, classesPerWeek, [], minutesPerClass, dashakamStart, dashakamEnd);

    const plan: LessonPlan = {
      id: `plan-${Date.now()}`,
      startDate,
      classesPerWeek,
      vacationDays: [],
      minutesPerClass,
      language,
      dashakamStart,
      dashakamEnd,
      createdAt: new Date().toISOString(),
      lessons,
    };

    // Save locally
    const updated = saveLessonPlan(plan);
    setPlans(updated);

    // Also save to DB if logged in
    if (isLoggedIn) {
      await saveLessonPlanToDB({
        name: `Dashakam ${dashakamStart}–${dashakamEnd}`,
        frequency: "custom",
        minutes_per_session: minutesPerClass,
        start_dashakam: dashakamStart,
        end_dashakam: dashakamEnd,
        schedule_json: lessons,
      });
    }

    setShowForm(false);
    toast({ title: "Lesson Plan Created", description: `${lessons.length} lessons scheduled` });
  };

  const handleDelete = async (id: string) => {
    const updated = deleteLessonPlan(id);
    setPlans(updated);
    if (isLoggedIn) await deleteLessonPlanFromDB(id);
    toast({ title: "Plan Deleted" });
  };

  const handleCompleteLesson = async (planId: string, lessonIdx: number) => {
    if (isLoggedIn) {
      const result = await completeLessonAndAdvance(planId, lessonIdx);
      if (result?.updated) {
        toast({
          title: "Session Complete! 🎉",
          description:
            result.nextLessonIndex >= 0
              ? `Moving to lesson ${result.nextLessonIndex + 1}`
              : "All lessons done!",
        });
      }
    }

    // Update local state too
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== planId) return p;
        const lessons = p.lessons.map((l, i) =>
          i === lessonIdx ? { ...l, completed: true, completedAt: new Date().toISOString() } : l
        );
        const updated: LessonPlan = { ...p, lessons };
        saveLessonPlan(updated);
        return updated;
      })
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Lesson Plans</h1>
            <p className="text-muted-foreground font-sans">
              Create a structured learning schedule for Narayaneeyam
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-gradient-gold px-4 py-2.5 font-sans font-semibold text-primary shadow-gold transition-transform hover:scale-105"
          >
            <Plus className="h-4 w-4" />
            New Plan
          </button>
        </div>

        {showForm && (
          <CreatePlanForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
        )}

        {plans.length === 0 && !showForm ? (
          <div className="rounded-xl bg-card border border-border p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-sans">
              No lesson plans yet. Create one to start your journey!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onDelete={handleDelete}
                onCompleteLesson={handleCompleteLesson}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
