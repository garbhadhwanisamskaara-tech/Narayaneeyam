import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sampleDashakams as localDashakams } from "@/data/narayaneeyam";
import { toast } from "@/hooks/use-toast";
import { Check, AlertTriangle, X, Save, Upload, BookOpen, FileText, Music } from "lucide-react";

/* ── types ── */
interface UploadProgress {
  dashakam_no: number;
  chant_uploaded: number;
  learn_uploaded: number;
  scripts_complete?: number;
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
  // script fields
  sanskrit_script: string;
  meter: string;
  scriptDirty: boolean;
}

interface DashakamDetails {
  dashakam_name: string;
  gist: string;
  benefits: string;
  remarks: string;
  image_url: string;
  is_published: boolean;
}

const emptyDetails: DashakamDetails = {
  dashakam_name: "",
  gist: "",
  benefits: "",
  remarks: "",
  image_url: "",
  is_published: false,
};

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
  const [savingScript, setSavingScript] = useState<number | null>(null);

  // Dashakam details
  const [details, setDetails] = useState<DashakamDetails>(emptyDetails);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  // Expanded script rows
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);

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

  /* ── summary stats ── */
  const progressValues = Object.values(progressMap);
  const audioComplete = progressValues.filter((p) => p.is_complete).length;
  const scriptsComplete = progressValues.filter((p) => (p.scripts_complete ?? 0) > 0).length;
  const totalVersesUploaded = progressValues.reduce((s, p) => s + p.chant_uploaded, 0);

  /* ── load dashakam details ── */
  const loadDetails = useCallback(async (dNo: number) => {
    const { data } = await supabase
      .from("dashakams")
      .select("*")
      .eq("dashakam_no", dNo)
      .eq("language_code", "en")
      .maybeSingle();
    if (data) {
      setDetails({
        dashakam_name: data.dashakam_name ?? "",
        gist: data.gist ?? "",
        benefits: data.benefits ?? "",
        remarks: data.remarks ?? "",
        image_url: data.image_url ?? "",
        is_published: !!data.is_published,
      });
    } else {
      // Pre-fill from local data
      const local = localDashakams.find((d) => d.id === dNo);
      setDetails({
        dashakam_name: local?.title_english ?? "",
        gist: local?.gist ?? "",
        benefits: local?.benefits ?? "",
        remarks: local?.remarks ?? "",
        image_url: local?.imageUrl ?? "",
        is_published: false,
      });
    }
    setDetailsDirty(false);
  }, []);

  /* ── load verses for a dashakam ── */
  const loadVerses = useCallback(async (dNo: number) => {
    const dk = localDashakams.find((d) => d.id === dNo);
    const numVerses = dk?.num_verses ?? 10;

    const [{ data: audioRows }, { data: scriptRows }] = await Promise.all([
      supabase.from("verses_audio").select("*").eq("dashakam_no", dNo).order("verse_no"),
      supabase.from("sanskrit_script").select("*").eq("dashakam_no", dNo).order("verse_no"),
    ]);

    const audioMap: Record<number, any> = {};
    audioRows?.forEach((r: any) => { audioMap[r.verse_no] = r; });

    const scriptMap: Record<number, any> = {};
    scriptRows?.forEach((r: any) => { scriptMap[r.verse_no] = r; });

    const rows: VerseRow[] = [];
    for (let v = 1; v <= numVerses; v++) {
      const a = audioMap[v];
      const s = scriptMap[v];
      rows.push({
        dashakam_no: dNo,
        verse_no: v,
        chant_audio_file: a?.chant_audio_file ?? "",
        learn_audio_file: a?.learn_audio_file ?? "",
        has_bell: s?.has_bell ?? (dk?.bell_verses?.includes(v) ?? false),
        has_sloka: false,
        dirty: false,
        sanskrit_script: s?.sanskrit_script ?? "",
        meter: s?.meter ?? "",
        scriptDirty: false,
      });
    }
    setVerses(rows);
    setExpandedVerse(null);
  }, []);

  const selectDashakam = (dNo: number) => {
    setSelectedDashakam(dNo);
    loadVerses(dNo);
    loadDetails(dNo);
  };

  /* ── update a verse field ── */
  const updateField = (verseNo: number, field: keyof VerseRow, value: any) => {
    setVerses((prev) =>
      prev.map((v) => {
        if (v.verse_no !== verseNo) return v;
        const isScript = field === "sanskrit_script" || field === "meter";
        return {
          ...v,
          [field]: value,
          dirty: isScript ? v.dirty : true,
          scriptDirty: isScript ? true : v.scriptDirty,
          // has_bell dirties both
          ...(field === "has_bell" ? { dirty: true, scriptDirty: true } : {}),
        };
      })
    );
  };

  /* ── save details ── */
  const saveDetails = async () => {
    if (!selectedDashakam) return;
    setSavingDetails(true);
    try {
      const { error } = await supabase.from("dashakams").upsert(
        {
          dashakam_no: selectedDashakam,
          language_code: "en",
          dashakam_name: details.dashakam_name,
          gist: details.gist,
          benefits: details.benefits,
          remarks: details.remarks,
          image_url: details.image_url,
          is_published: details.is_published,
        },
        { onConflict: "dashakam_no,language_code" }
      );
      if (error) throw error;
      setDetailsDirty(false);
      toast({ title: "Saved", description: `Dashakam ${selectedDashakam} details updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingDetails(false);
    }
  };

  /* ── save a single verse audio row ── */
  const saveRow = async (row: VerseRow) => {
    setSaving(row.verse_no);
    try {
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

      // Update bell in sanskrit_script too
      const { error: scriptErr } = await supabase
        .from("sanskrit_script")
        .upsert(
          { dashakam_no: row.dashakam_no, verse_no: row.verse_no, has_bell: row.has_bell },
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
      const dk = localDashakams.find((d) => d.id === row.dashakam_no);
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

      setVerses((prev) =>
        prev.map((v) => (v.verse_no === row.verse_no ? { ...v, dirty: false } : v))
      );
      await loadProgress();
      toast({ title: "Saved", description: `Verse ${row.verse_no} audio updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  /* ── save script for a verse ── */
  const saveScript = async (row: VerseRow) => {
    setSavingScript(row.verse_no);
    try {
      const { error } = await supabase
        .from("sanskrit_script")
        .upsert(
          {
            dashakam_no: row.dashakam_no,
            verse_no: row.verse_no,
            sanskrit_script: row.sanskrit_script,
            meter: row.meter,
            has_bell: row.has_bell,
          },
          { onConflict: "dashakam_no,verse_no" }
        );
      if (error) throw error;

      // Update scripts_complete count in progress
      const scriptsDone = verses.filter((v) =>
        (v.verse_no === row.verse_no ? row.sanskrit_script : v.sanskrit_script)
      ).length;

      await supabase.from("upload_progress").upsert(
        { dashakam_no: row.dashakam_no, scripts_complete: scriptsDone },
        { onConflict: "dashakam_no" }
      );

      setVerses((prev) =>
        prev.map((v) => (v.verse_no === row.verse_no ? { ...v, scriptDirty: false } : v))
      );
      await loadProgress();
      toast({ title: "Saved", description: `Verse ${row.verse_no} script updated.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingScript(null);
    }
  };

  const selectedDk = localDashakams.find((d) => d.id === selectedDashakam);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Upload className="h-7 w-7 text-secondary" />
        <h1 className="font-display text-2xl font-bold text-foreground">
          Admin Upload Panel
        </h1>
      </div>

      {/* ── Summary Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Music className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{audioComplete}</p>
            <p className="text-xs text-muted-foreground">Audio Complete</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
            <FileText className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{scriptsComplete}</p>
            <p className="text-xs text-muted-foreground">Scripts Started</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <BookOpen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalVersesUploaded}</p>
            <p className="text-xs text-muted-foreground">Verses Uploaded</p>
          </div>
        </div>
      </section>

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
          {localDashakams.map((d) => (
            <option key={d.id} value={d.id}>
              {d.id}. {d.title_english} ({d.num_verses} verses)
            </option>
          ))}
        </select>
      </section>

      {/* ── Dashakam Details Form ── */}
      {selectedDashakam && selectedDk && (
        <section className="mb-8 rounded-xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">
            Dashakam {selectedDk.id} — Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Dashakam Name</label>
              <input
                type="text"
                value={details.dashakam_name}
                onChange={(e) => { setDetails((d) => ({ ...d, dashakam_name: e.target.value })); setDetailsDirty(true); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Image URL</label>
              <input
                type="text"
                value={details.image_url}
                onChange={(e) => { setDetails((d) => ({ ...d, image_url: e.target.value })); setDetailsDirty(true); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Gist</label>
              <textarea
                value={details.gist}
                onChange={(e) => { setDetails((d) => ({ ...d, gist: e.target.value })); setDetailsDirty(true); }}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Benefits</label>
              <textarea
                value={details.benefits}
                onChange={(e) => { setDetails((d) => ({ ...d, benefits: e.target.value })); setDetailsDirty(true); }}
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Remarks</label>
              <input
                type="text"
                value={details.remarks}
                onChange={(e) => { setDetails((d) => ({ ...d, remarks: e.target.value })); setDetailsDirty(true); }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">Published</label>
              <button
                onClick={() => { setDetails((d) => ({ ...d, is_published: !d.is_published })); setDetailsDirty(true); }}
                className={`relative h-6 w-11 rounded-full transition-colors ${details.is_published ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${details.is_published ? "translate-x-5" : ""}`}
                />
              </button>
              <span className="text-xs text-muted-foreground">{details.is_published ? "Yes" : "No"}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={saveDetails}
              disabled={!detailsDirty || savingDetails}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
                ${detailsDirty
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
            >
              <Save className="h-4 w-4" />
              {savingDetails ? "Saving…" : "Save Dashakam"}
            </button>
          </div>
        </section>
      )}

      {/* ── Verse Table with Script Sub-rows ── */}
      {selectedDashakam && selectedDk && (
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">
            Verses — Audio & Script
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedDk.num_verses} verses · Bell on verse{selectedDk.bell_verses.length > 1 ? "s" : ""} {selectedDk.bell_verses.join(", ")}
            {" · "}Click a verse number to expand script entry.
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
                  <Fragment key={row.verse_no}>
                    {/* Audio row */}
                    <tr className={`border-t border-border transition-colors ${row.dirty ? "bg-secondary/10" : "hover:bg-muted/50"}`}>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setExpandedVerse(expandedVerse === row.verse_no ? null : row.verse_no)}
                          className={`font-semibold transition-colors ${expandedVerse === row.verse_no ? "text-secondary" : "text-foreground hover:text-secondary"}`}
                          title="Toggle script entry"
                        >
                          {row.verse_no} {expandedVerse === row.verse_no ? "▾" : "▸"}
                        </button>
                      </td>
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

                    {/* Script sub-row */}
                    {expandedVerse === row.verse_no && (
                      <tr className="border-t border-dashed border-border bg-muted/30">
                        <td className="px-3 py-3" colSpan={6}>
                          <div className="flex flex-col gap-3 md:flex-row md:items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">
                                Sanskrit Script
                              </label>
                              <textarea
                                value={row.sanskrit_script}
                                onChange={(e) => updateField(row.verse_no, "sanskrit_script", e.target.value)}
                                rows={3}
                                className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-serif focus:ring-1 focus:ring-ring resize-y"
                                placeholder="Enter Sanskrit verse text…"
                              />
                            </div>
                            <div className="w-full md:w-40">
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Meter</label>
                              <input
                                type="text"
                                value={row.meter}
                                onChange={(e) => updateField(row.verse_no, "meter", e.target.value)}
                                className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring"
                                placeholder="e.g. Anushtubh"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={row.has_bell}
                                onChange={(e) => updateField(row.verse_no, "has_bell", e.target.checked)}
                                className="h-4 w-4 rounded border-input text-secondary accent-secondary"
                              />
                              <label className="text-xs text-muted-foreground">Bell</label>
                            </div>
                            <button
                              onClick={() => saveScript(row)}
                              disabled={!row.scriptDirty || savingScript === row.verse_no}
                              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors
                                ${row.scriptDirty
                                  ? "bg-primary text-primary-foreground hover:bg-primary/80"
                                  : "bg-muted text-muted-foreground cursor-not-allowed"
                                }`}
                            >
                              <Save className="h-3 w-3" />
                              {savingScript === row.verse_no ? "…" : "Save Script"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
