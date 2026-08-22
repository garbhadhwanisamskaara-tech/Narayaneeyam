import { createContext, useContext, useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type FontSize = "small" | "medium" | "large" | "extra_large";

export const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "extra_large", label: "Extra Large" },
];

const STORAGE_KEY = "textSizePreference";
const LEGACY_KEY = "app-font-size";

function normalize(value: string | null | undefined): FontSize | null {
  if (!value) return null;
  if (value === "xlarge") return "extra_large";
  return FONT_SIZES.some((f) => f.value === value) ? (value as FontSize) : null;
}

interface PreferencesValue {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const PreferencesCtx = createContext<PreferencesValue | null>(null);

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesCtx);
  if (!ctx) throw new Error("usePreferences must be inside PreferencesProvider");
  return ctx;
}

function applyFontSize(size: FontSize) {
  document.documentElement.setAttribute("data-text-size", size);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth() as {
    user?: { id: string } | null;
    profile?: { text_size?: string | null } | null;
  };

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window === "undefined") return "medium";
    return (
      normalize(localStorage.getItem(STORAGE_KEY)) ??
      normalize(localStorage.getItem(LEGACY_KEY)) ??
      "medium"
    );
  });

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  // Sync from the user's profile once auth resolves (multi-device consistency)
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (syncedFor.current === user.id) return;
    syncedFor.current = user.id;
    const remote = normalize(profile.text_size);
    if (remote && remote !== fontSize) {
      setFontSizeState(remote);
      localStorage.setItem(STORAGE_KEY, remote);
    }
  }, [user?.id, profile, fontSize]);

  const value = useMemo<PreferencesValue>(
    () => ({
      fontSize,
      setFontSize: (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem(STORAGE_KEY, size);
        if (user?.id) {
          void supabase
            .from("profiles")
            .update({ text_size: size } as never)
            .eq("id", user.id);
        }
      },
    }),
    [fontSize, user?.id],
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}
