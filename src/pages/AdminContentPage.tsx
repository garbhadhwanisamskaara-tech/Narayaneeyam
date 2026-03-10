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
  Upload, Music, Image, FileText, Languages, Sparkles, Info,
} from "lucide-react";

/* ───────── helpers ───────── */
function pad(n: number, w: number) {
  return String(n).padStart(w, "0");
}

function audioFileName(d: number, v: number, variant?: string) {
  const base = `SL${pad(d, 3)}-${pad(v, 2)}`;
  return variant ? `${base}_${variant}.m4a` : `${base}.m4a`;
}

/* ───────── Component ───────── */
export default function AdminContentPage() {
  const { toast } = useToast();

  /* shared selector */
  const [dashakam, setDashakam] = useState(1);
  const [verse, setVerse] = useState(1);

  /* audio tab */
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioVariant, setAudioVariant] = useState<string>("chant");

  /* image tab */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageType, setImageType] = useState("hero");

  /* scripts tab */
  const [scriptLang, setScriptLang] = useState("sanskrit");
  const [scriptText, setScriptText] = useState("");

  /* translation tab */
  const [transLang, setTransLang] = useState("english");
  const [transText, setTransText] = useState("");

  /* metadata tab */
  const [bell, setBell] = useState(false);
  const [arathi, setArathi] = useState(false);
  const [prasadam, setPrasadam] = useState("");
  const [meter, setMeter] = useState("");

  const variantLabel: Record<string, string> = {
    chant: "Chant / Podcast",
    learn: "Learn",
    sloka: "Sloka",
    sloka_learn: "Sloka Learn",
  };

  const expectedName = (() => {
    switch (audioVariant) {
      case "learn":
        return audioFileName(dashakam, verse, "Learn");
      case "sloka":
        return audioFileName(dashakam, verse, "Sloka01_01");
      case "sloka_learn":
        return audioFileName(dashakam, verse, "Sloka01_01_Learn");
      default:
        return audioFileName(dashakam, verse);
    }
  })();

  const handleUpload = (type: string) => {
    // Placeholder — will connect to backend storage when Cloud is enabled
    toast({
      title: `${type} upload queued`,
      description: "Backend storage is not configured yet. Files will be saved once Cloud is enabled.",
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-6 w-6 text-secondary" />
            <h1 className="font-display text-3xl font-bold text-foreground">Content Manager</h1>
          </div>
          <p className="text-muted-foreground font-sans text-sm">
            Upload and manage audio files, images, scripts, and translations for each dashakam & verse.
          </p>
        </div>

        {/* Dashakam / Verse selector */}
        <div className="rounded-xl border border-border bg-card p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-sans text-muted-foreground">Dashakam (1–100)</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={dashakam}
                onChange={(e) => setDashakam(Math.max(1, Math.min(100, +e.target.value)))}
              />
            </div>
            <div>
              <Label className="text-sm font-sans text-muted-foreground">Verse (1–14)</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={verse}
                onChange={(e) => setVerse(Math.max(1, Math.min(14, +e.target.value)))}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="audio" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="audio" className="font-sans text-xs gap-1">
              <Music className="h-3.5 w-3.5" /> Audio
            </TabsTrigger>
            <TabsTrigger value="images" className="font-sans text-xs gap-1">
              <Image className="h-3.5 w-3.5" /> Images
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

          {/* ── Audio Tab ── */}
          <TabsContent value="audio">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Upload Audio</h3>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Audio Variant</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(variantLabel).map(([key, label]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant={audioVariant === key ? "default" : "outline"}
                      onClick={() => setAudioVariant(key)}
                      className="font-sans text-xs"
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm font-sans">
                <span className="text-muted-foreground">Expected file name: </span>
                <code className="text-primary font-semibold">{expectedName}</code>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Audio File (.m4a)</Label>
                <Input
                  type="file"
                  accept=".m4a,audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={() => handleUpload("Audio")}
                disabled={!audioFile}
                className="bg-gradient-peacock text-primary-foreground font-sans"
              >
                <Upload className="h-4 w-4 mr-1" /> Upload Audio
              </Button>
            </div>
          </TabsContent>

          {/* ── Images Tab ── */}
          <TabsContent value="images">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Upload Images</h3>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Image Type</Label>
                <div className="flex gap-2">
                  {[
                    { key: "hero", label: "Hero / Banner" },
                    { key: "dashakam", label: "Dashakam Cover" },
                    { key: "deity", label: "Deity Image" },
                  ].map((t) => (
                    <Button
                      key={t.key}
                      size="sm"
                      variant={imageType === t.key ? "default" : "outline"}
                      onClick={() => setImageType(t.key)}
                      className="font-sans text-xs"
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Image File</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </div>

              <Button
                onClick={() => handleUpload("Image")}
                disabled={!imageFile}
                className="bg-gradient-peacock text-primary-foreground font-sans"
              >
                <Upload className="h-4 w-4 mr-1" /> Upload Image
              </Button>
            </div>
          </TabsContent>

          {/* ── Scripts Tab ── */}
          <TabsContent value="scripts">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Verse Script — Dashakam {pad(dashakam, 3)}, Verse {pad(verse, 2)}
              </h3>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Script Language</Label>
                <div className="flex flex-wrap gap-2">
                  {["sanskrit", "english", "tamil", "kannada", "malayalam", "telugu", "hindi", "marathi"].map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={scriptLang === l ? "default" : "outline"}
                      onClick={() => setScriptLang(l)}
                      className="font-sans text-xs capitalize"
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Verse Text (Slokam)</Label>
                <Textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  rows={6}
                  placeholder={`Enter ${scriptLang} script for Dashakam ${dashakam}, Verse ${verse}…`}
                />
              </div>

              <Button
                onClick={() => handleUpload("Script")}
                disabled={!scriptText.trim()}
                className="bg-gradient-peacock text-primary-foreground font-sans"
              >
                <FileText className="h-4 w-4 mr-1" /> Save Script
              </Button>
            </div>
          </TabsContent>

          {/* ── Translations Tab ── */}
          <TabsContent value="translations">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Translation — Dashakam {pad(dashakam, 3)}, Verse {pad(verse, 2)}
              </h3>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Translation Language</Label>
                <div className="flex flex-wrap gap-2">
                  {["english", "tamil", "malayalam", "telugu", "hindi", "marathi"].map((l) => (
                    <Button
                      key={l}
                      size="sm"
                      variant={transLang === l ? "default" : "outline"}
                      onClick={() => setTransLang(l)}
                      className="font-sans text-xs capitalize"
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Meaning / Translation</Label>
                <Textarea
                  value={transText}
                  onChange={(e) => setTransText(e.target.value)}
                  rows={6}
                  placeholder={`Enter ${transLang} translation for Dashakam ${dashakam}, Verse ${verse}…`}
                />
              </div>

              <Button
                onClick={() => handleUpload("Translation")}
                disabled={!transText.trim()}
                className="bg-gradient-peacock text-primary-foreground font-sans"
              >
                <Languages className="h-4 w-4 mr-1" /> Save Translation
              </Button>
            </div>
          </TabsContent>

          {/* ── Metadata Tab ── */}
          <TabsContent value="metadata">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">
                Verse Metadata — Dashakam {pad(dashakam, 3)}, Verse {pad(verse, 2)}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Switch checked={bell} onCheckedChange={setBell} />
                  <Label className="font-sans text-sm">Bell</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={arathi} onCheckedChange={setArathi} />
                  <Label className="font-sans text-sm">Arathi</Label>
                </div>
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Prasadam</Label>
                <Input
                  value={prasadam}
                  onChange={(e) => setPrasadam(e.target.value)}
                  placeholder="e.g., Any fruit or water"
                />
              </div>

              <div>
                <Label className="text-sm font-sans text-muted-foreground mb-1 block">Meter</Label>
                <Input
                  value={meter}
                  onChange={(e) => setMeter(e.target.value)}
                  placeholder="e.g., Sragdharā"
                />
              </div>

              <Button
                onClick={() => handleUpload("Metadata")}
                className="bg-gradient-peacock text-primary-foreground font-sans"
              >
                <Info className="h-4 w-4 mr-1" /> Save Metadata
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
