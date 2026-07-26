import { useEffect, useState } from "react";
import { BellRing, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushReminders } from "@/hooks/usePushReminders";

function toTimeInput(value: string | null | undefined): string {
  if (!value) return "07:00";
  return value.slice(0, 5);
}

export default function ReminderSettings() {
  const { user } = useAuth();
  const { status, enabled, busy, enable, disable } = usePushReminders();
  const [reminderTime, setReminderTime] = useState("07:00");
  const [savingTime, setSavingTime] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("reminder_time")
        .eq("id", user.id)
        .maybeSingle();
      if (active && data) setReminderTime(toTimeInput((data as { reminder_time?: string }).reminder_time));
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleToggle = async (next: boolean) => {
    const { error } = next ? await enable() : await disable();
    if (error) toast.error(error);
    else toast.success(next ? "Daily reminder turned on 🪔" : "Daily reminder turned off");
  };

  const handleTimeChange = async (value: string) => {
    setReminderTime(value);
    if (!user || !value) return;
    setSavingTime(true);
    const { error } = await supabase
      .from("profiles")
      .update({ reminder_time: `${value}:00` })
      .eq("id", user.id);
    setSavingTime(false);
    if (error) toast.error("Could not save your reminder time.");
    else toast.success(`Reminder time set to ${value}`);
  };

  if (!user) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm p-5 mb-6">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground mb-4">
        <BellRing className="h-5 w-5 text-primary" />
        Daily Reminder
      </h2>

      {status === "unsupported" || status === "denied" ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {status === "unsupported"
            ? "Reminders aren't supported in this browser. On iPhone, add the app to your Home Screen and open it from there to enable them."
            : "Notifications are blocked for this site. Please allow notifications in your browser settings to receive daily reminders."}
        </p>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="daily-reminder" className="text-sm text-foreground">
            Get a daily reminder
            <span className="block text-xs text-muted-foreground font-normal mt-0.5">
              A gentle nudge to chant each day.
            </span>
          </Label>
          <Switch
            id="daily-reminder"
            checked={enabled}
            disabled={busy || status === "loading"}
            onCheckedChange={handleToggle}
          />
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-4">
        <Label htmlFor="reminder-time" className="flex items-center gap-2 text-sm text-foreground">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Reminder time
        </Label>
        <Input
          id="reminder-time"
          type="time"
          value={reminderTime}
          disabled={savingTime}
          onChange={(e) => handleTimeChange(e.target.value)}
          className="w-32"
        />
      </div>
    </section>
  );
}
