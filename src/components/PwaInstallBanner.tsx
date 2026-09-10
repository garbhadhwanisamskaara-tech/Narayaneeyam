import { useState } from "react";
import { X } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePwaPromptEligibility } from "@/hooks/usePwaPromptEligibility";

const HEADING = "Keep Narayaneeyam close";

export default function PwaInstallBanner() {
  const eligible = usePwaPromptEligibility();
  const { platform, promptInstall } = usePwaInstall();
  const { user } = useAuth();
  const [closed, setClosed] = useState(false);

  if (!eligible || closed || platform === "other") return null;

  const body =
    platform === "ios-safari"
      ? "Tap the Share button, then choose Add to Home Screen."
      : platform === "macos-safari"
        ? "Open the File menu, then choose Add to Dock."
        : "Add Narayaneeyam.app to your home screen for easy daily chanting.";

  const savePreference = async (patch: Record<string, string>) => {
    if (!user) return;
    try {
      await (supabase as any).from("profiles").update(patch).eq("id", user.id);
    } catch {
      // never block the member on this
    }
  };

  const handleYes = async () => {
    if (platform === "chromium") await promptInstall();
    setClosed(true);
  };

  const handleLater = async () => {
    setClosed(true);
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await savePreference({ pwa_prompt_snoozed_until: until });
  };

  const handleNo = async () => {
    setClosed(true);
    await savePreference({ pwa_prompt_dismissed_at: new Date().toISOString() });
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-3">
      <div className="relative rounded-xl border border-secondary bg-secondary/10 p-4 shadow-gold">
        <button
          type="button"
          onClick={handleLater}
          aria-label="Close"
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3">
          <img
            src={logoImg}
            alt="Narayaneeyam"
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-primary">{HEADING}</p>
            <p className="mt-1 font-sans text-sm text-foreground/80">{body}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleYes}
                className="rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {platform === "chromium" ? "Add to Home Screen" : "Yes"}
              </button>
              <button
                type="button"
                onClick={handleLater}
                className="rounded-lg border border-border px-4 py-2 font-sans text-sm text-foreground hover:bg-muted"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="rounded-lg px-4 py-2 font-sans text-sm text-muted-foreground hover:text-foreground"
              >
                No
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
