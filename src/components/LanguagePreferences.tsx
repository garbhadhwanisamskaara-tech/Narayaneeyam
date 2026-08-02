import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveLanguages } from "@/hooks/useActiveLanguages";

export default function LanguagePreferences() {
  const { user, profile, refreshProfile } = useAuth();
  const languages = useActiveLanguages();
  const [scriptLang, setScriptLang] = useState<string | null>(null);
  const [translationLang, setTranslationLang] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Seed from the already-loaded auth profile so the UI and content never diverge
  useEffect(() => {
    if (profile?.preferred_script_language) setScriptLang(profile.preferred_script_language);
    if (profile?.preferred_translation_language)
      setTranslationLang(profile.preferred_translation_language);
  }, [profile?.preferred_script_language, profile?.preferred_translation_language]);

  useEffect(() => {
    let active = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("preferred_script_language, preferred_translation_language")
        .eq("id", user.id)
        .maybeSingle();
      if (active && data) {
        const row = data as {
          preferred_script_language?: string | null;
          preferred_translation_language?: string | null;
        };
        setScriptLang(row.preferred_script_language ?? null);
        setTranslationLang(row.preferred_translation_language ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleChange = async (
    field: "preferred_script_language" | "preferred_translation_language",
    value: string,
  ) => {
    if (field === "preferred_script_language") setScriptLang(value);
    else setTranslationLang(value);

    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ [field]: value })
      .eq("id", user.id);
    if (!error) await refreshProfile();
    setSaving(false);
    if (error) toast.error("Could not save your language preference.");
    else toast.success("Language preference saved");
  };

  if (!user) return null;

  return (
    <section className="rounded-xl border border-border/60 bg-card shadow-sm p-5 mb-6">
      <h2 className="flex items-center gap-3 text-lg font-semibold text-foreground mb-4">
        <Languages className="h-5 w-5 text-primary" />
        Language Preferences
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="script-language" className="text-sm text-foreground">
            Script language
            <span className="block text-xs text-muted-foreground font-normal mt-0.5">
              Which script you'd like to read verses in.
            </span>
          </Label>
          <Select
            value={scriptLang ?? undefined}
            disabled={saving}
            onValueChange={(v) => handleChange("preferred_script_language", v)}
          >
            <SelectTrigger id="script-language" className="w-40">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/60">
          <Label htmlFor="translation-language" className="text-sm text-foreground">
            Translation language
            <span className="block text-xs text-muted-foreground font-normal mt-0.5">
              Which language you'd like meanings shown in.
            </span>
          </Label>
          <Select
            value={translationLang ?? undefined}
            disabled={saving}
            onValueChange={(v) => handleChange("preferred_translation_language", v)}
          >
            <SelectTrigger id="translation-language" className="w-40">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}
