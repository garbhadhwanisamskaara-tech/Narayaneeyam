import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { usePwaPromptEligibility } from "@/hooks/usePwaPromptEligibility";

const HEADING = "Keep Narayaneeyam close";
const AUTO_DISMISS_MS = 6000;

type FollowUp = {
  title: string;
  body: string;
  tone?: "success" | "neutral";
} | null;

export default function PwaInstallBanner() {
  const eligible = usePwaPromptEligibility();
  const { platform, canPrompt, promptInstall } = usePwaInstall();
  const { user } = useAuth();
  const [closed, setClosed] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUp>(null);

  useEffect(() => {
    if (!followUp) return;
    const timer = setTimeout(() => setFollowUp(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [followUp]);

  if (!followUp && (!eligible || closed || platform === "other")) return null;

  const savePreference = async (patch: Record<string, string>) => {
    if (!user) return;
    try {
      await (supabase as any).from("profiles").update(patch).eq("id", user.id);
    } catch {
      // never block the member on this
    }
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

  const showFollowUp = (next: FollowUp) => {
    setClosed(true);
    setFollowUp(next);
  };

  const handleYes = async () => {
    if (platform === "ios-safari") {
      showFollowUp({
        title: "Add Narayaneeyam to your home screen",
        body: "1. Tap the Share button in Safari's toolbar.\n2. Scroll down and tap Add to Home Screen.\n3. Tap Add. Look for the Narayaneeyam icon on your home screen — tap it anytime to jump straight into chanting.",
        tone: "neutral",
      });
      return;
    }

    if (platform === "macos-safari") {
      showFollowUp({
        title: "Add Narayaneeyam to your Dock",
        body: "1. Choose File from the menu bar.\n2. Select Add to Dock.\n3. Click Add. Look for Narayaneeyam in your Dock anytime to jump straight into chanting.",
        tone: "neutral",
      });
      return;
    }

    if (platform === "chromium") {
      if (canPrompt) {
        const outcome = await promptInstall();
        if (outcome === "accepted") {
          showFollowUp({
            title: "All set!",
            body: "Look for the Narayaneeyam icon on your home screen — tap it anytime to jump straight into chanting.",
            tone: "success",
          });
        } else if (outcome === "dismissed") {
          showFollowUp({
            title: "Install dismissed",
            body: "No worries. You can add Narayaneeyam to your home screen anytime from your browser menu.",
            tone: "neutral",
          });
        } else {
          showFollowUp({
            title: "Install unavailable",
            body: "Your browser didn't show the install prompt. Try adding Narayaneeyam from the browser menu instead.",
            tone: "neutral",
          });
        }
      } else {
        showFollowUp({
          title: "Install from your browser menu",
          body: "Look for Add to Home Screen or Install in your browser's menu to keep Narayaneeyam close.",
          tone: "neutral",
        });
      }
      return;
    }

    setClosed(true);
  };

  const body =
    platform === "ios-safari"
      ? "Tap the Share button, then choose Add to Home Screen."
      : platform === "macos-safari"
        ? "Open the File menu, then choose Add to Dock."
        : "Add Narayaneeyam.app to your home screen for easy daily chanting.";

  const isFollowUp = !!followUp;

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-3">
      <div
        className={`relative rounded-xl border p-4 shadow-gold ${
          isFollowUp && followUp?.tone === "success"
            ? "border-primary/30 bg-primary/10"
            : "border-secondary bg-secondary/10"
        }`}
      >
        <button
          type="button"
          onClick={() => setFollowUp(null)}
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
            <p className="font-display text-base font-semibold text-primary">
              {isFollowUp ? followUp!.title : HEADING}
            </p>
            <p className="mt-1 whitespace-pre-line font-sans text-sm text-foreground/80">
              {isFollowUp ? followUp!.body : body}
            </p>

            {isFollowUp ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFollowUp(null)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Got it
                </button>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
