import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Music, Image, FileText, Languages, Info, Sparkles, Save, Bell, BookOpen,
} from "lucide-react";
import {
  ALL_TRANSLITERATION_LANGUAGES,
  ALL_TRANSLATION_LANGUAGES,
} from "@/data/narayaneeyam";

/* ───────── helpers ───────── */
function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

/* ───────── All-language field set component ───────── */
function MultiLangFields({
  label,
  languages,
  values,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  languages: { value: string; label: string }[];
  values: Record<string, string>;
  onChange: (lang: string, val: string) => void;
  multiline?: boolean;
  placeholder?: (lang: string) => string;
}) {
  const [activeLang, setActiveLang] = useState(languages[0]?.value || "");

  return (
    <div className="space-y-3">
      <Label className="text-sm font-sans font-semibold text-foreground block">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {languages.map((l) => (
          <Button
            key={l.value}
            size="sm"
            variant={activeLang === l.value ? "default" : "outline"}
            onClick={() => setActiveLang(l.value)}
            className="font-sans text-xs"
          >
            {l.label}
            {values[l.value]?.trim() ? " ✓" : ""}
          </Button>
        ))}
      </div>
      {multiline ? (
        <Textarea
          value={values[activeLang] || ""}
          onChange={(e) => onChange(activeLang, e.target.value)}
          rows={5}
          placeholder={placeholder?.(activeLang) || `Enter ${activeLang} text…`}
        />
      ) : (
        <Input
          value={values[activeLang] || ""}
          onChange={(e) => onChange(activeLang, e.target.value)}
          placeholder={placeholder?.(activeLang) || `Enter ${activeLang} text…`}
        />
      )}
    </div>
  );
}

/* ───────── Main Component ───────── */
export default function AdminContentPage() {
  const { toast } = useToast();

  /* ── Selectors ── */
  const [dashakam, setDashakam] = useState(1);
  const [verse, setVerse] = useState(1);

  /* ── Dashakam-level fields ── */
  const [dashakamNames, setDashakamNames] = useState<Record<string, string>>({});
  const [dashakamGist, setDashakamGist] = useState("");
  const [dashakamBenefits, setDashakamBenefits] = useState("");
  const [dashakamRemarks, setDashakamRemarks] = useState("");
  const [numVerses, setNumVerses] = useState(10);

  /* ── Image ── */
  const [imageFileName, setImageFileName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  /* ── Audio ── */
  const [audioVariant, setAudioVariant] = useState<"chant" | "learn">("chant");
  const [audioFile, setAudioFile] = useState<File | null>(null);

  /* ── Bell / Arathi ── */
  const [bellEnabled, setBellEnabled] = useState(false);
  const [arathiEnabled, setArathiEnabled] = useState(false);

  /* ── Transliteration (all languages) ── */
  const [translitTexts, setTranslitTexts] = useState<Record<string, string>>({});

  /* ── Translation (all languages) ── */
  const [translationTexts, setTranslationTexts] = useState<Record<string, string>>({});

  /* ── Prasadam name (all languages) ── */
  const [prasadamNames, setPrasadamNames] = useState<Record<string, string>>({});

  /* ── Special slokam text (all languages) ── */
  const [slokaTexts, setSlokaTexts] = useState<Record<string, string>>({});

  /* ── Meter ── */
  const [meter, setMeter] = useState("");

  const chantFileName = `SL${pad(dashakam, 3)}-${pad(verse, 2)}.m4a`;
  const learnFileName = `SL${pad(dashakam, 3)}-${pad(verse, 2)}_Learn.m4a`;

  const handleSave = (section: string) => {
    toast({
      title: `${section} saved (local)`,
      description: "Data saved locally. Connect Cloud to persist to database.",
    });
  };

  const handleFileUpload = (type: string) => {
    toast({
      title: `${type} upload queued`,
      description: "Backend storage not configured yet. Files will sync once Cloud is enabled.",
    });
  };

  const updateMultiLang = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => (lang: string, val: string) => {
    setter((prev) => ({ ...prev, [lang]: val }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-secondary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Content Manager</h1>
          </div>
          <p className="text-muted-foreground font-sans text-sm">
            CRUD for dashakam metadata, audio, images, scripts, translations, and verse-level settings.
          </p>
        </div>

        {/* ── Dashakam & Verse selector ── */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs font-sans text-muted-foreground">Dashakam No (1–100)</Label>
              <Input
                type="number" min={1} max={100} value={dashakam}
                onChange={(e) => { setDashakam(Math.max(1, Math.min(100, +e.target.value))); setVerse(1); }}
              />
            </div>
            <div>
              <Label className="text-xs font-sans text-muted-foreground">Verse No (1–14)</Label>
              <Input
                type="number" min={1} max={14} value={verse}
                onChange={(e) => setVerse(Math.max(1, Math.min(14, +e.target.value)))}
              />
            </div>
            <div>
              <Label className="text-xs font-sans text-muted-foreground">Num Verses in Dashakam</Label>
              <Input
                type="number" min={1} max={14} value={numVerses}
                onChange={(e) => setNumVerses(Math.max(1, Math.min(14, +e.target.value)))}
              />
            </div>
            <div className="flex items-end">
              <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-sans text-muted-foreground w-full text-center">
                D{pad(dashakam, 3)} · V{pad(verse, 2)}
              </div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="dashakam" className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
            <TabsTrigger value="dashakam" className="font-sans text-xs gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Dashakam
            </TabsTrigger>
            <TabsTrigger value="audio" className="font-sans text-xs gap-1">
              <Music className="h-3.5 w-3.5" /> Audio
            </TabsTrigger>
            <TabsTrigger value="image" className="font-sans text-xs gap-1">
              <Image className="h-3.5 w-3.5" /> Image
            </TabsTrigger>
            <TabsTrigger value="scripts" className="font-sans text-xs gap-1">
              <FileText className="h-3.5 w-3.5" /> Scripts
            </TabsTrigger>
            <TabsTrigger value="translations" className="font-sans text-xs gap-1">
              <Languages className="h-3.5 w-3.5" /> Translations
            </TabsTrigger>
            <TabsTrigger value="metadata" className="font-sans text-xs gap-1">
              <Info className="h-3.5 w-3.5" /> Metadata
            </TabsTrigger>
          </TabsList>

          {/* ═══════════ TAB 1: Dashakam Info ═══════════ */}
          <TabsContent value="dashakam">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Dashakam {dashakam} — Info
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Dashakam name in all languages. Used across Learn, Chant, and Script modules.
              </p>

              <MultiLangFields
                label="Dashakam Name"
                languages={[
                  { value: "sanskrit", label: "Sanskrit" },
                  { value: "english", label: "English" },
                  { value: "tamil", label: "Tamil" },
                  { value: "malayalam", label: "Malayalam" },
                  { value: "telugu", label: "Telugu" },
                  { value: "kannada", label: "Kannada" },
                  { value: "hindi", label: "Hindi" },
                  { value: "marathi", label: "Marathi" },
                ]}
                values={dashakamNames}
                onChange={updateMultiLang(setDashakamNames)}
                placeholder={(l) => `Dashakam ${dashakam} name in ${l}…`}
              />

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Gist / Summary</Label>
                <Textarea
                  value={dashakamGist}
                  onChange={(e) => setDashakamGist(e.target.value)}
                  rows={3}
                  placeholder="Brief gist of the dashakam…"
                />
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Benefits</Label>
                <Textarea
                  value={dashakamBenefits}
                  onChange={(e) => setDashakamBenefits(e.target.value)}
                  rows={2}
                  placeholder="Spiritual benefits of chanting this dashakam…"
                />
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Remarks (optional)</Label>
                <Input
                  value={dashakamRemarks}
                  onChange={(e) => setDashakamRemarks(e.target.value)}
                  placeholder="Any special notes…"
                />
              </div>

              <Button onClick={() => handleSave("Dashakam Info")} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Save className="h-4 w-4 mr-1" /> Save Dashakam Info
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 2: Audio ═══════════ */}
          <TabsContent value="audio">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Audio — D{pad(dashakam, 3)} V{pad(verse, 2)}
              </h3>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Audio Variant</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant={audioVariant === "chant" ? "default" : "outline"} onClick={() => setAudioVariant("chant")} className="font-sans text-xs">
                    Chant / Podcast
                  </Button>
                  <Button size="sm" variant={audioVariant === "learn" ? "default" : "outline"} onClick={() => setAudioVariant("learn")} className="font-sans text-xs">
                    Learn
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs font-sans text-muted-foreground">Expected file name:</p>
                <code className="text-sm text-primary font-semibold font-mono">
                  {audioVariant === "chant" ? chantFileName : learnFileName}
                </code>
                <p className="text-xs text-muted-foreground mt-1 font-sans">
                  {audioVariant === "chant"
                    ? "Used in: Chant with Me, Podcast modules"
                    : "Used in: Learn with Me module (has built-in silence gaps)"}
                </p>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Audio File (.m4a)</Label>
                <Input type="file" accept=".m4a,audio/*" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} />
              </div>

              <Button onClick={() => handleFileUpload("Audio")} disabled={!audioFile} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Upload className="h-4 w-4 mr-1" /> Upload Audio
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 3: Image ═══════════ */}
          <TabsContent value="image">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Display Image — Dashakam {dashakam}
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Image displayed while playing this dashakam. One image per dashakam.
              </p>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Image File Name</Label>
                <Input
                  value={imageFileName}
                  onChange={(e) => setImageFileName(e.target.value)}
                  placeholder={`e.g., D${pad(dashakam, 3)}_krishna.jpg`}
                />
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Upload Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>

              <Button onClick={() => handleFileUpload("Image")} disabled={!imageFile} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Upload className="h-4 w-4 mr-1" /> Upload Image
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 4: Scripts (Transliteration + Slokam) ═══════════ */}
          <TabsContent value="scripts">
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Scripts — D{pad(dashakam, 3)} V{pad(verse, 2)}
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Transliteration and special slokam text in all languages. Used in Learn, Chant, and Script modules.
              </p>

              {/* Transliteration */}
              <MultiLangFields
                label="Transliteration (Verse Text)"
                languages={ALL_TRANSLITERATION_LANGUAGES}
                values={translitTexts}
                onChange={updateMultiLang(setTranslitTexts)}
                multiline
                placeholder={(l) => `Verse transliteration in ${l}…`}
              />

              <div className="border-t border-border pt-5">
                {/* Special slokam */}
                <MultiLangFields
                  label="Special Slokam (to be recited at this verse)"
                  languages={[
                    { value: "sanskrit", label: "Sanskrit" },
                    { value: "english", label: "English" },
                    { value: "tamil", label: "Tamil" },
                    { value: "malayalam", label: "Malayalam" },
                    { value: "telugu", label: "Telugu" },
                    { value: "kannada", label: "Kannada" },
                    { value: "hindi", label: "Hindi" },
                    { value: "marathi", label: "Marathi" },
                  ]}
                  values={slokaTexts}
                  onChange={updateMultiLang(setSlokaTexts)}
                  multiline
                  placeholder={(l) => `Special slokam in ${l} for verse ${verse}…`}
                />
              </div>

              <Button onClick={() => handleSave("Scripts")} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Save className="h-4 w-4 mr-1" /> Save Scripts
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 5: Translations ═══════════ */}
          <TabsContent value="translations">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Translation — D{pad(dashakam, 3)} V{pad(verse, 2)}
              </h3>
              <p className="text-xs text-muted-foreground font-sans">
                Meaning / translation in all languages. Used in Learn and Chant modules.
              </p>

              <MultiLangFields
                label="Translation / Meaning"
                languages={ALL_TRANSLATION_LANGUAGES}
                values={translationTexts}
                onChange={updateMultiLang(setTranslationTexts)}
                multiline
                placeholder={(l) => `Meaning in ${l} for verse ${verse}…`}
              />

              <Button onClick={() => handleSave("Translation")} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Save className="h-4 w-4 mr-1" /> Save Translation
              </Button>
            </div>
          </TabsContent>

          {/* ═══════════ TAB 6: Metadata ═══════════ */}
          <TabsContent value="metadata">
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Metadata — D{pad(dashakam, 3)} V{pad(verse, 2)}
              </h3>

              {/* Bell & Arathi */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Switch checked={bellEnabled} onCheckedChange={setBellEnabled} />
                  <div>
                    <Label className="font-sans text-sm font-medium">Bell</Label>
                    <p className="text-xs text-muted-foreground font-sans">Ring bell at this verse</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Switch checked={arathiEnabled} onCheckedChange={setArathiEnabled} />
                  <div>
                    <Label className="font-sans text-sm font-medium">Arathi</Label>
                    <p className="text-xs text-muted-foreground font-sans">Perform arathi at this verse</p>
                  </div>
                </div>
              </div>

              {/* Prasadam in all languages */}
              <MultiLangFields
                label="Prasadam Name"
                languages={[
                  { value: "english", label: "English" },
                  { value: "tamil", label: "Tamil" },
                  { value: "sanskrit", label: "Sanskrit" },
                  { value: "malayalam", label: "Malayalam" },
                  { value: "telugu", label: "Telugu" },
                  { value: "kannada", label: "Kannada" },
                  { value: "hindi", label: "Hindi" },
                  { value: "marathi", label: "Marathi" },
                ]}
                values={prasadamNames}
                onChange={updateMultiLang(setPrasadamNames)}
                placeholder={(l) => `Prasadam name in ${l}…`}
              />

              {/* Meter */}
              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Meter (Chandas)</Label>
                <Input
                  value={meter}
                  onChange={(e) => setMeter(e.target.value)}
                  placeholder="e.g., Sragdharā"
                />
              </div>

              <Button onClick={() => handleSave("Metadata")} className="bg-gradient-peacock text-primary-foreground font-sans">
                <Save className="h-4 w-4 mr-1" /> Save Metadata
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
