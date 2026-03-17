import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sampleDashakams as dashakams } from "@/data/narayaneeyam";
import { toast } from "@/hooks/use-toast";
import { Check, AlertTriangle, X, Save, Upload } from "lucide-react";

/* ── types ── */
interface UploadProgress {
  dashakam_no: number;
  chant_uploaded: number;
  learn_uploaded: number;
  is_complete: boolean;
}

interface VerseRow {
  dashakam_no: number;
  verse_no: number;
  chant_audio_file: string;
  learn_audio_file: string;
  has_bell: boolean;
  has_sloka: boolean;
  dirty: boolean;
}

/* ── helpers ── */
function statusColor(p: UploadProgress | undefined): string {
  if (!p) return "bg-destructive/80 border-destructive";
  if (p.is_complete) return "bg-emerald-600/80 border-emerald-500";
  if (p.chant_uploaded > 0 || p.learn_uploaded > 0) return "bg-amber-500/80 border-amber-400";
  return "bg-destructive/80 border-destructive";
}

function statusIcon(p: UploadProgress | undefined) {
  if (!p) return <X className="h-3 w-3" />;
  if (p.is_complete) return <Check className="h-3 w-3" />;
  if (p.chant_uploaded > 0 || p.learn_uploaded > 0) return <AlertTriangle className="h-3 w-3" />;
  return <X className="h-3 w-3" />;
}

export default function AdminUploadPage() {
  const [progressMap, setProgressMap] = useState<Record<number, UploadProgress>>({});
  const [selectedDashakam, setSelectedDashakam] = useState<number | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [saving, setSaving] = useState<number | null>(null);

  /* ── load progress grid ── */
  const loadProgress = useCallback(async () => {
    const { data } = await supabase
      .from("upload_progress")
      .select("*")
      .order("dashakam_no");
    if (data) {
      const map: Record<number, UploadProgress> = {};
      data.forEach((r: any) => { map[r.dashakam_no] = r; });
      setProgressMap(map);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  /* ── load verses for a dashakam ── */
  const loadVerses = useCallback(async (dNo: number) => {
    const dk = dashakams.find((d) => d.id === dNo);
    const numVerses = dk?.num_verses ?? 10;

    // Fetch existing audio rows
    const { data: audioRows } = await supabase
      .from("verses_audio")
      .select("*")
      .eq("dashakam_no", dNo)
      .order("verse_no");

    // Fetch existing script rows (for bell info)
    const { data: scriptRows } = await supabase
      .from("sanskrit_script")
      .select("dashakam_no, verse_no, has_bell")
      .eq("dashakam_no", dNo)
      .order("verse_no");

    const audioMap: Record<number, any> = {};
    audioRows?.forEach((r: any) => { audioMap[r.verse_no] = r; });

    const bellMap: Record<number, boolean> = {};
    scriptRows?.forEach((r: any) => { bellMap[r.verse_no] = !!r.has_bell; });

    const rows: VerseRow[] = [];
    for (let v = 1; v <= numVerses; v++) {
      const a = audioMap[v];
      rows.push({
        dashakam_no: dNo,
        verse_no: v,
        chant_audio_file: a?.chant_audio_file ?? "",
        learn_audio_file: a?.learn_audio_file ?? "",
        has_bell: bellMap[v] ?? (dk?.bell_verses?.includes(v) ?? false),
        has_sloka: false,
        dirty: false,
      });
    }
    setVerses(rows);
  }, []);

  const selectDashakam = (dNo: number) => {
    setSelectedDashakam(dNo);
    loadVerses(dNo);
  };

  /* ── update a verse field ── */
  const updateField = (verseNo: number, field: keyof VerseRow, value: any) => {
    setVerses((prev) =>
      prev.map((v) =>
        v.verse_no === verseNo ? { ...v, [field]: value, dirty: true } : v
      )
    );
  };

  /* ── save a single verse row ── */
  const saveRow = async (row: VerseRow) => {
    setSaving(row.verse_no);
    try {
      // Upsert audio
      const { error: audioErr } = await supabase
        .from("verses_audio")
        .upsert(
          {
            dashakam_no: row.dashakam_no,
            verse_no: row.verse_no,
            chant_audio_file: row.chant_audio_file,
            learn_audio_file: row.learn_audio_file,
          },
          { onConflict: "dashakam_no,verse_no" }
        );

      if (audioErr) throw audioErr;

      // Upsert bell info in sanskrit_script
      const { error: scriptErr } = await supabase
        .from("sanskrit_script")
        .upsert(
          {
            dashakam_no: row.dashakam_no,
            verse_no: row.verse_no,
            has_bell: row.has_bell,
          },
          { onConflict: "dashakam_no,verse_no" }
        );

      if (scriptErr) throw scriptErr;

      // Update progress
      const chantCount = verses.filter(
        (v) => (v.verse_no === row.verse_no ? row.chant_audio_file : v.chant_audio_file)
      ).length;
      const learnCount = verses.filter(
        (v) => (v.verse_no === row.verse_no ? row.learn_audio_file : v.learn_audio_file)
      ).length;
      const dk = dashakams.find((d) => d.id === row.dashakam_no);
      const total = dk?.num_verses ?? 10;

      await supabase.from("upload_progress").upsert(
        {
          dashakam_no: row.dashakam_no,
          chant_uploaded: chantCount,
          learn_uploaded: learnCount,
          is_complete: chantCount >= total && learnCount >= total,
        },
        { onConflict: "dashakam_no" }
      );

      // Mark clean
      setVerses((prev) =>
        prev.map((v) => (v.verse_no === row.verse_no ? { ...v, dirty: false } : v))
      );
      await loadProgress();
      toast({ title: "Saved", description: `Verse ${row.verse_no} updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const selectedDk = dashakams.find((d) => d.id === selectedDashakam);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Upload className="h-7 w-7 text-secondary" />
        <h1 className="font-display text-2xl font-bold text-foreground">
          Audio Upload Panel
        </h1>
      </div>

      {/* ── Progress Grid ── */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Upload Progress — 100 Dashakams
        </h2>
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
            const p = progressMap[n];
            const isSelected = selectedDashakam === n;
            return (
              <button
                key={n}
                onClick={() => selectDashakam(n)}
                className={`
                  relative flex flex-col items-center justify-center rounded-md border p-1
                  text-xs font-semibold text-white transition-all
                  ${statusColor(p)}
                  ${isSelected ? "ring-2 ring-secondary ring-offset-2 ring-offset-background scale-110 z-10" : "hover:scale-105"}
                `}
                title={`Dashakam ${n}${p?.is_complete ? " ✓" : p ? " (partial)" : " (empty)"}`}
              >
                <span className="text-[10px] leading-none">{n}</span>
                <span className="mt-0.5">{statusIcon(p)}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-primary inline-block" /> Complete</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-secondary inline-block" /> Partial</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-destructive inline-block" /> Empty</span>
        </div>
      </section>

      {/* ── Dashakam Selector ── */}
      <section className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-1">Select Dashakam</label>
        <select
          value={selectedDashakam ?? ""}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v) selectDashakam(v);
          }}
          className="w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring"
        >
          <option value="">— pick a dashakam —</option>
          {dashakams.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id}. {d.title_english} ({d.num_verses} verses)
            </option>
          ))}
        </select>
      </section>

      {/* ── Verse Table ── */}
      {selectedDashakam && selectedDk && (
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">
            Dashakam {selectedDk.id}: {selectedDk.title_english}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedDk.num_verses} verses · Bell on verse{selectedDk.bell_verses.length > 1 ? "s" : ""} {selectedDk.bell_verses.join(", ")}
          </p>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium w-16">#</th>
                  <th className="px-3 py-2 text-left font-medium">Chant Audio File</th>
                  <th className="px-3 py-2 text-left font-medium">Learn Audio File</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Bell</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Sloka</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Save</th>
                </tr>
              </thead>
              <tbody>
                {verses.map((row) => (
                  <tr
                    key={row.verse_no}
                    className={`border-t border-border transition-colors ${row.dirty ? "bg-secondary/10" : "hover:bg-muted/50"}`}
                  >
                    <td className="px-3 py-2 font-semibold text-foreground">{row.verse_no}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.chant_audio_file}
                        onChange={(e) => updateField(row.verse_no, "chant_audio_file", e.target.value)}
                        placeholder={`SL${String(selectedDashakam).padStart(3, "0")}-${String(row.verse_no).padStart(2, "0")}.m4a`}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={row.learn_audio_file}
                        onChange={(e) => updateField(row.verse_no, "learn_audio_file", e.target.value)}
                        placeholder={`SL${String(selectedDashakam).padStart(3, "0")}-${String(row.verse_no).padStart(2, "0")}_Learn.m4a`}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.has_bell}
                        onChange={(e) => updateField(row.verse_no, "has_bell", e.target.checked)}
                        className="h-4 w-4 rounded border-input text-secondary accent-secondary"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={row.has_sloka}
                        onChange={(e) => updateField(row.verse_no, "has_sloka", e.target.checked)}
                        className="h-4 w-4 rounded border-input text-secondary accent-secondary"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => saveRow(row)}
                        disabled={!row.dirty || saving === row.verse_no}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors
                          ${row.dirty
                            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                          }`}
                      >
                        <Save className="h-3 w-3" />
                        {saving === row.verse_no ? "…" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
