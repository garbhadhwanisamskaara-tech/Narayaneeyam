import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Calendar, CheckCircle } from "lucide-react";
import {
  getLessonPlans,
  saveLessonPlan,
  deleteLessonPlan,
  generateLessons,
  type LessonPlan,
} from "@/lib/lessonPlan";
import { LANGUAGES } from "@/data/narayaneeyam";
import { useToast } from "@/hooks/use-toast";

export default function LessonPlanPage() {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  // Form state
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [classesPerWeek, setClassesPerWeek] = useState(3);
  const [minutesPerClass, setMinutesPerClass] = useState(30);
  const [dashakamStart, setDashakamStart] = useState(1);
  const [dashakamEnd, setDashakamEnd] = useState(10);
  const [language, setLanguage] = useState("english");

  useEffect(() => {
    setPlans(getLessonPlans());
  }, []);

  const handleCreate = () => {
    if (dashakamEnd < dashakamStart) {
      toast({ title: "Invalid range", description: "End dashakam must be >= start", variant: "destructive" });
      return;
    }

    const lessons = generateLessons(
      startDate,
      classesPerWeek,
      [],
      minutesPerClass,
      dashakamStart,
      dashakamEnd
    );

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

    const updated = saveLessonPlan(plan);
    setPlans(updated);
    setShowForm(false);
    toast({ title: "Lesson Plan Created", description: `${lessons.length} lessons scheduled` });
  };

  const handleDelete = (id: string) => {
    const updated = deleteLessonPlan(id);
    setPlans(updated);
    toast({ title: "Plan Deleted" });
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

        {/* Create Form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-6 mb-8"
          >
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">
              Create New Lesson Plan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground font-sans">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground font-sans">Classes per Week</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={classesPerWeek}
                  onChange={(e) => setClassesPerWeek(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground font-sans">Minutes per Class</label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={minutesPerClass}
                  onChange={(e) => setMinutesPerClass(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground font-sans">From Dashakam</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={dashakamStart}
                  onChange={(e) => setDashakamStart(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm text-muted-foreground font-sans">To Dashakam</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={dashakamEnd}
                  onChange={(e) => setDashakamEnd(Number(e.target.value))}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-sans text-foreground"
                />
              </div>
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
                onClick={handleCreate}
                className="rounded-lg bg-primary px-6 py-2.5 font-sans font-semibold text-primary-foreground shadow-peacock transition-transform hover:scale-105"
              >
                Create Plan
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-border px-6 py-2.5 font-sans text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {/* Plans List */}
        {plans.length === 0 && !showForm ? (
          <div className="rounded-xl bg-card border border-border p-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-sans">
              No lesson plans yet. Create one to start your journey!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const completed = plan.lessons.filter((l) => l.completed).length;
              const progress = plan.lessons.length > 0 ? (completed / plan.lessons.length) * 100 : 0;

              return (
                <motion.div
                  key={plan.id}
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
                      onClick={() => handleDelete(plan.id)}
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
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground font-sans">
                      {completed} / {plan.lessons.length} completed
                    </span>
                    <span className="text-xs font-semibold text-secondary font-sans">
                      {Math.round(progress)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
