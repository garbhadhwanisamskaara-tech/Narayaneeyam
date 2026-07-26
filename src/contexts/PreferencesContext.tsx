import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";

export type FontSize = "small" | "medium" | "large" | "xlarge";

export const FONT_SIZES: { value: FontSize; label: string; px: number }[] = [
  { value: "small", label: "Small", px: 14 },
  { value: "medium", label: "Medium", px: 16 },
  { value: "large", label: "Large", px: 18 },
  { value: "xlarge", label: "X-Large", px: 20 },
];

const STORAGE_KEY = "app-font-size";

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
  const entry = FONT_SIZES.find((f) => f.value === size) ?? FONT_SIZES[1];
  document.documentElement.style.fontSize = `${entry.px}px`;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    if (typeof window === "undefined") return "medium";
    const saved = localStorage.getItem(STORAGE_KEY) as FontSize | null;
    return saved && FONT_SIZES.some((f) => f.value === saved) ? saved : "medium";
  });

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const value = useMemo<PreferencesValue>(
    () => ({
      fontSize,
      setFontSize: (size: FontSize) => {
        setFontSizeState(size);
        localStorage.setItem(STORAGE_KEY, size);
      },
    }),
    [fontSize],
  );

  return <PreferencesCtx.Provider value={value}>{children}</PreferencesCtx.Provider>;
}
