import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { cn } from "@/lib/utils";

type Mode = "saptaah" | "21_day" | "100_day" | "daily";

const MODES: { id: Mode; title: string; days: string; pace: string }[] = [
  { id: "saptaah", title: "Saptaah", days: "7 days", pace: "14–15 dashakams/day" },
  { id: "21_day", title: "21-Day Parayanam", days: "21 days", pace: "5 dashakams/day" },
  { id: "100_day", title: "100-Day Parayanam", days: "100 days", pace: "1 dashakam/day" },
  { id: "daily", title: "Daily", days: "Open-ended", pace: "1 dashakam/day" },
];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function calcEndDate(mode: Mode, start: Date): Date | null {
  if (mode === "saptaah") return addDays(start, 7);
  if (mode === "21_day") return addDays(start, 21);
  if (mode === "100_day") return addDays(start, 100);
  return null;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export default function ChallengeCreationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<Mode | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [startDate, setStartDate] = useState<Date>(today);
  const [submitting, setSubmitting] = useState(false);

  const endDate = mode ? calcEndDate(mode, startDate) : null;

  const handleSubmit = async () => {
    if (!user || !mode) return;
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from("challenge_sessions")
        .insert({
          user_id: user.id,
          mode,
          challenge_type: "personal",
          start_date: toIso(startDate),
          end_date: endDate ? toIso(endDate) : null,
          spiritual_state: "sankalpam_taken",
          technical_state: "ACTIVE",
          dashakams_target: 100,
          dashakams_done: 0,
        })
        .select();

      if (error) throw error;
      const session_id = data?.[0]?.id;
      navigate("/challenges/sankalpa", {
        state: { session_id, mode, start_date: toIso(startDate) },
      });
    } catch (e: any) {
      toast({ title: "Could not start parayanam", description: e?.message ?? "Please try again.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-2xl">
      <SEO path="/challenges/new" title="Begin a Parayanam — Sriman Narayaneeyam" description="Begin your personal Narayaneeyam parayanam — choose a mode, set a start date, and take your sankalpa." />

      {/* Stepper */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-3">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center font-display text-sm font-semibold border",
                step >= s
                  ? "bg-secondary text-primary border-secondary"
                  : "bg-card text-muted-foreground border-border",
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={cn("h-px w-8", step > s ? "bg-secondary" : "bg-border")} />}
          </div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {step === 1 && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-secondary" /> Choose your parayanam
            </h1>
            <p className="text-muted-foreground font-sans mb-6">Select a mode that suits your devotion and rhythm.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {MODES.map((m) => {
                const selected = mode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={cn(
                      "text-left rounded-xl border bg-card p-5 transition-all",
                      selected
                        ? "border-secondary border-2 shadow-gold ring-1 ring-secondary/40"
                        : "border-border hover:border-secondary/50",
                    )}
                  >
                    <p className="font-display text-lg font-semibold text-foreground">{m.title}</p>
                    <p className="text-xs uppercase tracking-wide text-secondary font-sans mt-1">{m.days}</p>
                    <p className="text-sm text-muted-foreground font-sans mt-2">{m.pace}</p>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                disabled={!mode}
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-secondary" /> When will you begin?
            </h1>
            <p className="text-muted-foreground font-sans mb-6">Choose an auspicious start date.</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setStartDate(today)}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-sans hover:border-secondary"
              >
                Today
              </button>
              <button
                onClick={() => setStartDate(addDays(today, 1))}
                className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-sans hover:border-secondary"
              >
                Tomorrow
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 mb-6 inline-block">
              <DayPicker
                mode="single"
                selected={startDate}
                onSelect={(d) => d && setStartDate(d)}
                disabled={{ before: today }}
                className="pointer-events-auto"
              />
            </div>

            <p className="text-sm text-foreground font-sans mb-6">
              Selected: <span className="font-semibold text-secondary">{formatDate(startDate)}</span>
            </p>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 font-sans text-sm font-medium text-foreground hover:border-secondary"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}

        {step === 3 && mode && (
          <>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Confirm your sankalpa
            </h1>
            <p className="text-muted-foreground font-sans mb-6">Review your parayanam details before beginning.</p>

            <div className="rounded-xl border border-secondary/40 bg-card p-6 mb-8 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-sans">Mode</p>
                <p className="font-display text-xl font-semibold text-secondary">
                  {MODES.find((m) => m.id === mode)!.title}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-sans">Start date</p>
                <p className="font-display text-base font-semibold text-foreground">{formatDate(startDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground font-sans">End date</p>
                <p className="font-display text-base font-semibold text-foreground">
                  {endDate ? formatDate(endDate) : "Open-ended"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 font-sans text-sm font-medium text-foreground hover:border-secondary disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-6 py-2.5 font-sans text-sm font-semibold text-primary shadow-gold transition-transform hover:scale-105 disabled:opacity-40"
              >
                {submitting ? "Beginning…" : "Continue to sankalpa"}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
