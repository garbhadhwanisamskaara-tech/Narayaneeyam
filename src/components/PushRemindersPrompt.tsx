import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { usePushReminders } from "@/hooks/usePushReminders";
import { registerPushServiceWorker } from "@/lib/pushNotifications";

const DISMISS_KEY = "push-prompt-dismissed";

/** Gentle one-time prompt to turn on parayanam reminders. */
export default function PushRemindersPrompt() {
  const { status, enabled, busy, enable } = usePushReminders();
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1"
  );
  const [error, setError] = useState<string | null>(null);

  if (dismissed || enabled || status !== "ready") return null;

  const handleEnable = async () => {
    setError(null);
    await registerPushServiceWorker();
    const { error: err } = await enable();
    if (err) setError(err);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-peacock">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground">Turn on parayanam reminders</h2>
          <p className="mt-1 font-sans text-sm text-muted-foreground">
            A gentle nudge on the days your dashakams are waiting for you.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              onClick={() => void handleEnable()}
              disabled={busy}
              className="rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Enable reminders
            </button>
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Not now
            </button>
          </div>
          {error && <p className="mt-2 font-sans text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </section>
  );
}
