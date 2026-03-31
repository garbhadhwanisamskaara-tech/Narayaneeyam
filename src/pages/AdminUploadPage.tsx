import { useState, useEffect, useCallback, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sampleDashakams as localDashakams } from "@/data/narayaneeyam";
import { toast } from "@/hooks/use-toast";
import {
  Check, AlertTriangle, X, Save, Upload, BookOpen, FileText,
  Music, Globe, Plus, Pencil, Mic
} from "lucide-react";

/* ── constants ── */
const LANGUAGES = [
  { code: "en", label: "EN" },
  { code: "ta", label: "TA" },
  { code: "ml", label: "ML" },
  { code: "te", label: "TE" },
  { code: "hi", label: "HI" },
  { code: "mr", label: "MR" },
  { code: "kn", label: "KN" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];
type TopTab = "dashakams" | "slokas" | "rituals";

/* ── types ── */
interface UploadProgress {
  dashakam_no: number;
  chant_uploaded: number;
  learn_uploaded: number;
  scripts_complete?: number;
  translations_complete?: boolean;
  is_complete: boolean;
}

interface LangContent {
  transliteration_text: string;
  translation_text: string;
  prasadam_text: string;
  dirty: boolean;
}

interface SlokaData {
  id?: string;
  sloka_num: number;
  sloka_verse: number;
  auto_play: boolean;
  dirty: boolean;
}

interface VerseRow {
  dashakam_no: number;
  verse_no: number;
  chant_audio_file: string;
  learn_audio_file: string;
  has_bell: boolean;
  has_sloka: boolean;
  dirty: boolean;
  sanskrit_text: string;
  meter: string;
  scriptDirty: boolean;
  langContent: Record<LangCode, LangContent>;
  langLoaded: Set<LangCode>;
  activeLang: LangCode;
  sloka: SlokaData;
  sloka_audio_id: string | null;
}

interface DashakamDetails {
  dashakam_name: string;
  gist: string;
  benefits: string;
  remarks: string;
  image_url: string;
  is_published: boolean;
}

/* ── Sloka management types ── */
interface SlokaListItem {
  id: string;
  sloka_num: number;
  sloka_verse: number;
  auto_play: boolean;
  lang_count: number;
  has_audio: boolean;
}

interface SlokaEditForm {
  id?: string;
  sloka_num: number;
  sloka_verse: number;
  auto_play: boolean;
  chant_audio_file: string;
  learn_audio_file: string;
  after_dashakam_no: number;
  after_verse_no: number;
  audioDirty: boolean;
  langContent: Record<LangCode, { transliteration_text: string; translation_text: string; dirty: boolean }>;
  langExistence: Set<LangCode>;
  activeLang: LangCode;
}

/* ── Ritual chant types ── */
interface RitualChantItem {
  id: string;
  chant_key: string;
  trigger_point: string;
  display_order: number;
  chant_audio_file: string | null;
  learn_audio_file: string | null;
}

interface RitualEditForm {
  id: string;
  chant_key: string;
  chant_audio_file: string;
  learn_audio_file: string;
  audioDirty: boolean;
  langContent: Record<LangCode, { transliteration_text: string; translation_text: string; dirty: boolean }>;
  langExistence: Set<LangCode>;
  activeLang: LangCode;
}

const emptyDetails: DashakamDetails = {
  dashakam_name: "", gist: "", benefits: "", remarks: "", image_url: "", is_published: false,
};

const emptyLangContent = (): Record<LangCode, LangContent> => {
  const m: any = {};
  LANGUAGES.forEach((l) => {
    m[l.code] = { transliteration_text: "", translation_text: "", prasadam_text: "", dirty: false };
  });
  return m;
};

const emptyLangPair = (): Record<LangCode, { transliteration_text: string; translation_text: string; dirty: boolean }> => {
  const m: any = {};
  LANGUAGES.forEach((l) => { m[l.code] = { transliteration_text: "", translation_text: "", dirty: false }; });
  return m;
};

const emptySloka: SlokaData = { sloka_num: 0, sloka_verse: 0, auto_play: true, dirty: false };

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

/* ═══════════════════════════════════════════════════════ */
export default function AdminUploadPage() {
  const [topTab, setTopTab] = useState<TopTab>("dashakams");

  /* ── DASHAKAMS TAB STATE ── */
  const [progressMap, setProgressMap] = useState<Record<number, UploadProgress>>({});
  const [selectedDashakam, setSelectedDashakam] = useState<number | null>(null);
  const [verses, setVerses] = useState<VerseRow[]>([]);
  const [saving, setSaving] = useState<number | null>(null);
  const [savingScript, setSavingScript] = useState<number | null>(null);
  const [savingLang, setSavingLang] = useState<string | null>(null);
  const [savingSloka, setSavingSloka] = useState<number | null>(null);
  const [details, setDetails] = useState<DashakamDetails>(emptyDetails);
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);
  const [langExistence, setLangExistence] = useState<Record<string, Set<LangCode>>>({});

  /* ── SLOKAS TAB STATE ── */
  const [slokaList, setSlokaList] = useState<SlokaListItem[]>([]);
  const [slokaEdit, setSlokaEdit] = useState<SlokaEditForm | null>(null);
  const [savingSlokaAudio, setSavingSlokaAudio] = useState(false);
  const [savingSlokaLang, setSavingSlokaLang] = useState<string | null>(null);

  /* ── RITUALS TAB STATE ── */
  const [ritualList, setRitualList] = useState<RitualChantItem[]>([]);
  const [ritualEdit, setRitualEdit] = useState<RitualEditForm | null>(null);
  const [savingRitualAudio, setSavingRitualAudio] = useState(false);
  const [savingRitualLang, setSavingRitualLang] = useState<string | null>(null);

  /* ═══════════ DASHAKAMS TAB LOGIC (unchanged) ═══════════ */
  const loadProgress = useCallback(async () => {
    const { data } = await supabase.from("upload_progress").select("*").order("dashakam_no");
    if (data) {
      const map: Record<number, UploadProgress> = {};
      data.forEach((r: any) => { map[r.dashakam_no] = r; });
      setProgressMap(map);
    }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  const progressValues = Object.values(progressMap);
  const audioComplete = progressValues.filter((p) => p.is_complete).length;
  const scriptsComplete = progressValues.filter((p) => (p.scripts_complete ?? 0) > 0).length;
  const totalVersesUploaded = progressValues.reduce((s, p) => s + p.chant_uploaded, 0);

  const loadDetails = useCallback(async (dNo: number) => {
    const { data } = await supabase.from("dashakams").select("*").eq("dashakam_no", dNo).eq("language_code", "en").maybeSingle();
    if (data) {
      setDetails({ dashakam_name: data.dashakam_name ?? "", gist: data.gist ?? "", benefits: data.benefits ?? "", remarks: data.remarks ?? "", image_url: data.image_url ?? "", is_published: !!data.is_published });
    } else {
      const local = localDashakams.find((d) => d.id === dNo);
      setDetails({ dashakam_name: local?.title_english ?? "", gist: local?.gist ?? "", benefits: local?.benefits ?? "", remarks: local?.remarks ?? "", image_url: local?.imageUrl ?? "", is_published: false });
    }
    setDetailsDirty(false);
  }, []);

  const loadVerses = useCallback(async (dNo: number) => {
    const dk = localDashakams.find((d) => d.id === dNo);
    const numVerses = dk?.num_verses ?? 10;
    const [{ data: audioRows }, { data: scriptRows }] = await Promise.all([
      supabase.from("verses_audio").select("*").eq("dashakam_no", dNo).order("verse_no"),
      supabase.from("language_script").select("verse_no, transliteration_text, translation_text").eq("dashakam_no", dNo).eq("language_code", "sa").order("verse_no"),
    ]);
    const audioMap: Record<number, any> = {};
    audioRows?.forEach((r: any) => { audioMap[r.verse_no] = r; });
    const scriptMap: Record<number, any> = {};
    scriptRows?.forEach((r: any) => { scriptMap[r.verse_no] = r; });
    const rows: VerseRow[] = [];
    for (let v = 1; v <= numVerses; v++) {
      const a = audioMap[v]; const s = scriptMap[v];
      rows.push({
        dashakam_no: dNo, verse_no: v,
        chant_audio_file: a?.chant_audio_file ?? "", learn_audio_file: a?.learn_audio_file ?? "",
        has_bell: dk?.bell_verses?.includes(v) ?? false, has_sloka: !!a?.sloka_audio_id, dirty: false,
        sanskrit_text: s?.transliteration_text ?? "", meter: "", scriptDirty: false,
        langContent: emptyLangContent(), langLoaded: new Set(), activeLang: "en",
        sloka: { ...emptySloka }, sloka_audio_id: a?.sloka_audio_id ?? null,
      });
    }
    setVerses(rows); setExpandedVerse(null);
  }, []);

  const selectDashakam = (dNo: number) => { setSelectedDashakam(dNo); loadVerses(dNo); loadDetails(dNo); };

  const loadLangContent = useCallback(async (dNo: number, vNo: number, lang: LangCode) => {
    const [{ data: langRow }, { data: prasRow }] = await Promise.all([
      supabase.from("language_script").select("*").eq("dashakam_no", dNo).eq("verse_no", vNo).eq("language_code", lang).maybeSingle(),
      supabase.from("prasadam").select("*").eq("dashakam_no", dNo).eq("verse_no", vNo).eq("language_code", lang).maybeSingle(),
    ]);
    setVerses((prev) => prev.map((v) => {
      if (v.verse_no !== vNo) return v;
      const updated = { ...v, langContent: { ...v.langContent }, langLoaded: new Set(v.langLoaded) };
      updated.langContent[lang] = { transliteration_text: langRow?.transliteration_text ?? "", translation_text: langRow?.translation_text ?? "", prasadam_text: prasRow?.prasadam_text ?? "", dirty: false };
      updated.langLoaded.add(lang);
      return updated;
    }));
  }, []);

  const loadSlokaDataForVerse = useCallback(async (slokaId: string, vNo: number) => {
    const { data } = await supabase.from("slokas").select("*").eq("id", slokaId).maybeSingle();
    if (data) {
      setVerses((prev) => prev.map((v) => v.verse_no !== vNo ? v : { ...v, sloka: { id: data.id, sloka_num: data.sloka_num ?? 0, sloka_verse: data.sloka_verse ?? 0, auto_play: data.auto_play ?? true, dirty: false } }));
    }
  }, []);

  const loadLangExistence = useCallback(async (dNo: number) => {
    const { data } = await supabase.from("language_script").select("verse_no, language_code").eq("dashakam_no", dNo);
    const map: Record<string, Set<LangCode>> = {};
    data?.forEach((r: any) => { const key = String(r.verse_no); if (!map[key]) map[key] = new Set(); map[key].add(r.language_code as LangCode); });
    setLangExistence(map);
  }, []);

  useEffect(() => { if (selectedDashakam) loadLangExistence(selectedDashakam); }, [selectedDashakam, loadLangExistence]);

  useEffect(() => {
    if (expandedVerse && selectedDashakam) {
      const row = verses.find((v) => v.verse_no === expandedVerse);
      if (row && !row.langLoaded.has(row.activeLang)) loadLangContent(selectedDashakam, expandedVerse, row.activeLang);
      if (row && row.sloka_audio_id && !row.sloka.id) loadSlokaDataForVerse(row.sloka_audio_id, expandedVerse);
    }
  }, [expandedVerse, selectedDashakam, verses, loadLangContent, loadSlokaDataForVerse]);

  const updateField = (verseNo: number, field: keyof VerseRow, value: any) => {
    setVerses((prev) => prev.map((v) => {
      if (v.verse_no !== verseNo) return v;
      const isScript = field === "sanskrit_text" || field === "meter";
      return { ...v, [field]: value, dirty: isScript ? v.dirty : true, scriptDirty: isScript ? true : v.scriptDirty, ...(field === "has_bell" ? { dirty: true, scriptDirty: true } : {}) };
    }));
  };

  const updateLangField = (verseNo: number, lang: LangCode, field: keyof LangContent, value: string) => {
    setVerses((prev) => prev.map((v) => {
      if (v.verse_no !== verseNo) return v;
      const updated = { ...v, langContent: { ...v.langContent } };
      updated.langContent[lang] = { ...v.langContent[lang], [field]: value, dirty: true };
      return updated;
    }));
  };

  const setActiveLang = (verseNo: number, lang: LangCode) => {
    setVerses((prev) => prev.map((v) => (v.verse_no === verseNo ? { ...v, activeLang: lang } : v)));
    const row = verses.find((v) => v.verse_no === verseNo);
    if (row && !row.langLoaded.has(lang) && selectedDashakam) loadLangContent(selectedDashakam, verseNo, lang);
  };

  const updateVerseSlokaField = (verseNo: number, field: keyof SlokaData, value: any) => {
    setVerses((prev) => prev.map((v) => v.verse_no !== verseNo ? v : { ...v, sloka: { ...v.sloka, [field]: value, dirty: true } }));
  };

  const saveDetails = async () => {
    if (!selectedDashakam) return; setSavingDetails(true);
    try {
      const { error } = await supabase.from("dashakams").upsert({ dashakam_no: selectedDashakam, language_code: "en", dashakam_name: details.dashakam_name, gist: details.gist, benefits: details.benefits, remarks: details.remarks, image_url: details.image_url, is_published: details.is_published }, { onConflict: "dashakam_no,language_code" });
      if (error) throw error; setDetailsDirty(false);
      toast({ title: "Saved", description: `Dashakam ${selectedDashakam} details updated.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingDetails(false); }
  };

  const saveRow = async (row: VerseRow) => {
    setSaving(row.verse_no);
    try {
      const { error: audioErr } = await supabase.from("verses_audio").upsert({ dashakam_no: row.dashakam_no, verse_no: row.verse_no, chant_audio_file: row.chant_audio_file, learn_audio_file: row.learn_audio_file }, { onConflict: "dashakam_no,verse_no" });
      if (audioErr) throw audioErr;
      const chantCount = verses.filter((v) => (v.verse_no === row.verse_no ? row.chant_audio_file : v.chant_audio_file)).length;
      const learnCount = verses.filter((v) => (v.verse_no === row.verse_no ? row.learn_audio_file : v.learn_audio_file)).length;
      const dk = localDashakams.find((d) => d.id === row.dashakam_no); const total = dk?.num_verses ?? 10;
      await supabase.from("upload_progress").upsert({ dashakam_no: row.dashakam_no, chant_uploaded: chantCount, learn_uploaded: learnCount, is_complete: chantCount >= total && learnCount >= total }, { onConflict: "dashakam_no" });
      setVerses((prev) => prev.map((v) => (v.verse_no === row.verse_no ? { ...v, dirty: false } : v)));
      await loadProgress();
      toast({ title: "Saved", description: `Verse ${row.verse_no} audio updated.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSaving(null); }
  };

  const saveScript = async (row: VerseRow) => {
    setSavingScript(row.verse_no);
    try {
      const { error } = await supabase.from("language_script").upsert({ dashakam_no: row.dashakam_no, verse_no: row.verse_no, language_code: "sa", transliteration_text: row.sanskrit_text, translation_text: "" }, { onConflict: "dashakam_no,verse_no,language_code" });
      if (error) throw error;
      const scriptsDone = verses.filter((v) => (v.verse_no === row.verse_no ? row.sanskrit_text : v.sanskrit_text)).length;
      await supabase.from("upload_progress").upsert({ dashakam_no: row.dashakam_no, scripts_complete: scriptsDone }, { onConflict: "dashakam_no" });
      setVerses((prev) => prev.map((v) => (v.verse_no === row.verse_no ? { ...v, scriptDirty: false } : v)));
      await loadProgress();
      toast({ title: "Saved", description: `Verse ${row.verse_no} script updated.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingScript(null); }
  };

  const saveLangContent = async (row: VerseRow, lang: LangCode) => {
    const key = `${row.verse_no}-${lang}`; setSavingLang(key);
    const lc = row.langContent[lang];
    try {
      const { error: langErr } = await supabase.from("language_script").upsert({ dashakam_no: row.dashakam_no, verse_no: row.verse_no, language_code: lang, transliteration_text: lc.transliteration_text, translation_text: lc.translation_text }, { onConflict: "dashakam_no,verse_no,language_code" });
      if (langErr) throw langErr;
      if (lc.prasadam_text) {
        const { error: prasErr } = await supabase.from("prasadam").upsert({ dashakam_no: row.dashakam_no, verse_no: row.verse_no, language_code: lang, prasadam_text: lc.prasadam_text }, { onConflict: "dashakam_no,verse_no,language_code" });
        if (prasErr) throw prasErr;
      }
      setLangExistence((prev) => { const copy = { ...prev }; const vKey = String(row.verse_no); if (!copy[vKey]) copy[vKey] = new Set(); copy[vKey] = new Set(copy[vKey]); copy[vKey].add(lang); return copy; });
      setVerses((prev) => prev.map((v) => { if (v.verse_no !== row.verse_no) return v; const updated = { ...v, langContent: { ...v.langContent } }; updated.langContent[lang] = { ...v.langContent[lang], dirty: false }; return updated; }));
      if (lang === "en") {
        const { data: enRows } = await supabase.from("language_script").select("verse_no").eq("dashakam_no", row.dashakam_no).eq("language_code", "en").not("translation_text", "is", null);
        const dk = localDashakams.find((d) => d.id === row.dashakam_no); const total = dk?.num_verses ?? 10;
        await supabase.from("upload_progress").upsert({ dashakam_no: row.dashakam_no, translations_complete: (enRows?.length ?? 0) >= total }, { onConflict: "dashakam_no" });
        await loadProgress();
      }
      toast({ title: "Saved", description: `Verse ${row.verse_no} ${lang.toUpperCase()} content saved.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingLang(null); }
  };

  const saveVerseSloka = async (row: VerseRow) => {
    setSavingSloka(row.verse_no);
    try {
      const payload: any = { sloka_num: row.sloka.sloka_num, sloka_verse: row.sloka.sloka_verse, auto_play: row.sloka.auto_play };
      if (row.sloka.id) payload.id = row.sloka.id;
      const { data, error } = await supabase.from("slokas").upsert(payload, { onConflict: "id" }).select("id").single();
      if (error) throw error;
      const slokaId = data.id;
      const { error: linkErr } = await supabase.from("verses_audio").upsert({ dashakam_no: row.dashakam_no, verse_no: row.verse_no, sloka_audio_id: slokaId }, { onConflict: "dashakam_no,verse_no" });
      if (linkErr) throw linkErr;
      setVerses((prev) => prev.map((v) => v.verse_no !== row.verse_no ? v : { ...v, has_sloka: true, sloka_audio_id: slokaId, sloka: { ...v.sloka, id: slokaId, dirty: false } }));
      toast({ title: "Saved", description: `Sloka for verse ${row.verse_no} saved.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingSloka(null); }
  };

  const selectedDk = localDashakams.find((d) => d.id === selectedDashakam);

  /* ═══════════ SLOKAS TAB LOGIC ═══════════ */
  const loadSlokaList = useCallback(async () => {
    const { data: slokas } = await supabase.from("slokas").select("*").order("sloka_num");
    if (!slokas) { setSlokaList([]); return; }

    const ids = slokas.map((s: any) => s.id);
    const [{ data: scriptRows }, { data: audioRows }] = await Promise.all([
      ids.length ? supabase.from("sloka_scripts").select("sloka_audio_id, language_code").in("sloka_audio_id", ids) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from("sloka_audio").select("sloka_audio_id").in("sloka_audio_id", ids) : Promise.resolve({ data: [] }),
    ]);

    const langCountMap: Record<string, Set<string>> = {};
    (scriptRows ?? []).forEach((r: any) => {
      if (!langCountMap[r.sloka_audio_id]) langCountMap[r.sloka_audio_id] = new Set();
      langCountMap[r.sloka_audio_id].add(r.language_code);
    });
    const audioSet = new Set((audioRows ?? []).map((r: any) => r.sloka_audio_id));

    setSlokaList(slokas.map((s: any) => ({
      id: s.id, sloka_num: s.sloka_num ?? 0, sloka_verse: s.sloka_verse ?? 0,
      auto_play: s.auto_play ?? true,
      lang_count: langCountMap[s.id]?.size ?? 0,
      has_audio: audioSet.has(s.id),
    })));
  }, []);

  useEffect(() => { if (topTab === "slokas") loadSlokaList(); }, [topTab, loadSlokaList]);

  const openSlokaEdit = async (sloka?: SlokaListItem) => {
    const form: SlokaEditForm = {
      id: sloka?.id,
      sloka_num: sloka?.sloka_num ?? 0,
      sloka_verse: sloka?.sloka_verse ?? 0,
      auto_play: sloka?.auto_play ?? true,
      chant_audio_file: "", learn_audio_file: "",
      after_dashakam_no: 0, after_verse_no: 0,
      audioDirty: false,
      langContent: emptyLangPair(),
      langExistence: new Set(),
      activeLang: "en",
    };

    if (sloka?.id) {
      const [{ data: audio }, { data: scripts }] = await Promise.all([
        supabase.from("sloka_audio").select("*").eq("sloka_audio_id", sloka.id).maybeSingle(),
        supabase.from("sloka_scripts").select("language_code, transliteration_text, translation_text").eq("sloka_audio_id", sloka.id),
      ]);
      if (audio) {
        form.chant_audio_file = audio.chant_audio_file ?? "";
        form.learn_audio_file = audio.learn_audio_file ?? "";
        form.after_dashakam_no = audio.after_dashakam_no ?? 0;
        form.after_verse_no = audio.after_verse_no ?? 0;
      }
      (scripts ?? []).forEach((r: any) => {
        form.langContent[r.language_code as LangCode] = { transliteration_text: r.transliteration_text ?? "", translation_text: r.translation_text ?? "", dirty: false };
        form.langExistence.add(r.language_code as LangCode);
      });
    }
    setSlokaEdit(form);
  };

  const saveSlokaAudio = async () => {
    if (!slokaEdit) return;
    setSavingSlokaAudio(true);
    try {
      let slokaId = slokaEdit.id;
      if (!slokaId) {
        const { data, error } = await supabase.from("slokas").insert({ sloka_num: slokaEdit.sloka_num, sloka_verse: slokaEdit.sloka_verse, auto_play: slokaEdit.auto_play }).select("id").single();
        if (error) throw error;
        slokaId = data.id;
        setSlokaEdit((f) => f ? { ...f, id: slokaId } : f);
      } else {
        const { error } = await supabase.from("slokas").update({ sloka_num: slokaEdit.sloka_num, sloka_verse: slokaEdit.sloka_verse, auto_play: slokaEdit.auto_play }).eq("id", slokaId);
        if (error) throw error;
      }
      const { error: audioErr } = await supabase.from("sloka_audio").upsert({
        sloka_audio_id: slokaId, chant_audio_file: slokaEdit.chant_audio_file, learn_audio_file: slokaEdit.learn_audio_file,
        after_dashakam_no: slokaEdit.after_dashakam_no, after_verse_no: slokaEdit.after_verse_no,
      }, { onConflict: "sloka_audio_id" });
      if (audioErr) throw audioErr;
      setSlokaEdit((f) => f ? { ...f, audioDirty: false } : f);
      await loadSlokaList();
      toast({ title: "Saved", description: "Sloka audio saved." });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingSlokaAudio(false); }
  };

  const saveSlokaLangContent = async (lang: LangCode) => {
    if (!slokaEdit?.id) { toast({ title: "Save audio first", description: "Please save audio to create the sloka record first.", variant: "destructive" }); return; }
    setSavingSlokaLang(lang);
    const lc = slokaEdit.langContent[lang];
    try {
      const { error } = await supabase.from("sloka_scripts").upsert({
        sloka_audio_id: slokaEdit.id, language_code: lang, transliteration_text: lc.transliteration_text, translation_text: lc.translation_text,
      }, { onConflict: "sloka_audio_id,language_code" });
      if (error) throw error;
      setSlokaEdit((f) => {
        if (!f) return f;
        const updated = { ...f, langContent: { ...f.langContent }, langExistence: new Set(f.langExistence) };
        updated.langContent[lang] = { ...lc, dirty: false };
        updated.langExistence.add(lang);
        return updated;
      });
      await loadSlokaList();
      toast({ title: "Saved", description: `Sloka ${lang.toUpperCase()} content saved.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingSlokaLang(null); }
  };

  /* ═══════════ RITUALS TAB LOGIC ═══════════ */
  const loadRitualList = useCallback(async () => {
    const { data } = await supabase.from("ritual_chants").select("*").order("display_order");
    setRitualList((data ?? []).map((r: any) => ({
      id: r.id, chant_key: r.chant_key ?? "", trigger_point: r.trigger_point ?? "",
      display_order: r.display_order ?? 0, chant_audio_file: r.chant_audio_file, learn_audio_file: r.learn_audio_file,
    })));
  }, []);

  useEffect(() => { if (topTab === "rituals") loadRitualList(); }, [topTab, loadRitualList]);

  const openRitualEdit = async (item: RitualChantItem) => {
    const form: RitualEditForm = {
      id: item.id, chant_key: item.chant_key,
      chant_audio_file: item.chant_audio_file ?? "", learn_audio_file: item.learn_audio_file ?? "",
      audioDirty: false, langContent: emptyLangPair(), langExistence: new Set(), activeLang: "en",
    };
    const { data: scripts } = await supabase.from("ritual_chant_scripts").select("language_code, transliteration_text, translation_text").eq("chant_key", item.chant_key);
    (scripts ?? []).forEach((r: any) => {
      form.langContent[r.language_code as LangCode] = { transliteration_text: r.transliteration_text ?? "", translation_text: r.translation_text ?? "", dirty: false };
      form.langExistence.add(r.language_code as LangCode);
    });
    setRitualEdit(form);
  };

  const saveRitualAudio = async () => {
    if (!ritualEdit) return;
    setSavingRitualAudio(true);
    try {
      const { error } = await supabase.from("ritual_chants").update({
        chant_audio_file: ritualEdit.chant_audio_file, learn_audio_file: ritualEdit.learn_audio_file,
      }).eq("id", ritualEdit.id);
      if (error) throw error;
      setRitualEdit((f) => f ? { ...f, audioDirty: false } : f);
      await loadRitualList();
      toast({ title: "Saved", description: "Ritual chant audio saved." });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingRitualAudio(false); }
  };

  const saveRitualLang = async (lang: LangCode) => {
    if (!ritualEdit) return;
    setSavingRitualLang(lang);
    const lc = ritualEdit.langContent[lang];
    try {
      const { error } = await supabase.from("ritual_chant_scripts").upsert({
        chant_key: ritualEdit.chant_key, language_code: lang, transliteration_text: lc.transliteration_text, translation_text: lc.translation_text,
      }, { onConflict: "chant_key,language_code" });
      if (error) throw error;
      setRitualEdit((f) => {
        if (!f) return f;
        const updated = { ...f, langContent: { ...f.langContent }, langExistence: new Set(f.langExistence) };
        updated.langContent[lang] = { ...lc, dirty: false };
        updated.langExistence.add(lang);
        return updated;
      });
      toast({ title: "Saved", description: `Ritual chant ${lang.toUpperCase()} content saved.` });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); } finally { setSavingRitualLang(null); }
  };

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Upload className="h-7 w-7 text-secondary" />
        <h1 className="font-display text-2xl font-bold text-foreground">Admin Upload Panel</h1>
      </div>

      {/* ── Top-level Tabs ── */}
      <div className="flex gap-1 mb-8 border-b border-border">
        {([
          { key: "dashakams" as TopTab, label: "Dashakams", icon: <BookOpen className="h-4 w-4" /> },
          { key: "slokas" as TopTab, label: "Slokas", icon: <FileText className="h-4 w-4" /> },
          { key: "rituals" as TopTab, label: "Ritual Chants", icon: <Mic className="h-4 w-4" /> },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTopTab(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${topTab === t.key
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ═══ DASHAKAMS TAB ═══ */}
      {/* ══════════════════════════════════════════ */}
      {topTab === "dashakams" && (
        <>
          {/* Summary Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Music className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{audioComplete}</p><p className="text-xs text-muted-foreground">Audio Complete</p></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10"><FileText className="h-5 w-5 text-secondary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{scriptsComplete}</p><p className="text-xs text-muted-foreground">Scripts Started</p></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10"><BookOpen className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold text-foreground">{totalVersesUploaded}</p><p className="text-xs text-muted-foreground">Verses Uploaded</p></div>
            </div>
          </section>

          {/* Progress Grid */}
          <section className="mb-8">
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Upload Progress — 100 Dashakams</h2>
            <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
              {Array.from({ length: 100 }, (_, i) => i + 1).map((n) => {
                const p = progressMap[n]; const isSelected = selectedDashakam === n;
                return (
                  <button key={n} onClick={() => selectDashakam(n)}
                    className={`relative flex flex-col items-center justify-center rounded-md border p-1 text-xs font-semibold text-white transition-all ${statusColor(p)} ${isSelected ? "ring-2 ring-secondary ring-offset-2 ring-offset-background scale-110 z-10" : "hover:scale-105"}`}
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

          {/* Dashakam Selector */}
          <section className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-1">Select Dashakam</label>
            <select value={selectedDashakam ?? ""} onChange={(e) => { const v = Number(e.target.value); if (v) selectDashakam(v); }}
              className="w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring">
              <option value="">— pick a dashakam —</option>
              {localDashakams.map((d) => (<option key={d.id} value={d.id}>{d.id}. {d.title_english} ({d.num_verses} verses)</option>))}
            </select>
          </section>

          {/* Dashakam Details Form */}
          {selectedDashakam && selectedDk && (
            <section className="mb-8 rounded-xl border border-border bg-card p-6">
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Dashakam {selectedDk.id} — Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Dashakam Name</label>
                  <input type="text" value={details.dashakam_name} onChange={(e) => { setDetails((d) => ({ ...d, dashakam_name: e.target.value })); setDetailsDirty(true); }} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Image URL</label>
                  <input type="text" value={details.image_url} onChange={(e) => { setDetails((d) => ({ ...d, image_url: e.target.value })); setDetailsDirty(true); }} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Gist</label>
                  <textarea value={details.gist} onChange={(e) => { setDetails((d) => ({ ...d, gist: e.target.value })); setDetailsDirty(true); }} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-y" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Benefits</label>
                  <textarea value={details.benefits} onChange={(e) => { setDetails((d) => ({ ...d, benefits: e.target.value })); setDetailsDirty(true); }} rows={2} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring resize-y" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Remarks</label>
                  <input type="text" value={details.remarks} onChange={(e) => { setDetails((d) => ({ ...d, remarks: e.target.value })); setDetailsDirty(true); }} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-ring" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-muted-foreground">Published</label>
                  <button onClick={() => { setDetails((d) => ({ ...d, is_published: !d.is_published })); setDetailsDirty(true); }} className={`relative h-6 w-11 rounded-full transition-colors ${details.is_published ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${details.is_published ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-xs text-muted-foreground">{details.is_published ? "Yes" : "No"}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={saveDetails} disabled={!detailsDirty || savingDetails}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${detailsDirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                  <Save className="h-4 w-4" />{savingDetails ? "Saving…" : "Save Dashakam"}
                </button>
              </div>
            </section>
          )}

          {/* Verse Table */}
          {selectedDashakam && selectedDk && (
            <section>
              <h2 className="font-display text-lg font-semibold text-foreground mb-2">Verses — Audio, Script & Content</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {selectedDk.num_verses} verses · Bell on verse{selectedDk.bell_verses.length > 1 ? "s" : ""} {selectedDk.bell_verses.join(", ")} · Click a verse number to expand.
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
                        <tr className={`border-t border-border transition-colors ${row.dirty ? "bg-secondary/10" : "hover:bg-muted/50"}`}>
                          <td className="px-3 py-2">
                            <button onClick={() => setExpandedVerse(expandedVerse === row.verse_no ? null : row.verse_no)}
                              className={`font-semibold transition-colors ${expandedVerse === row.verse_no ? "text-secondary" : "text-foreground hover:text-secondary"}`} title="Toggle expanded view">
                              {row.verse_no} {expandedVerse === row.verse_no ? "▾" : "▸"}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={row.chant_audio_file} onChange={(e) => updateField(row.verse_no, "chant_audio_file", e.target.value)}
                              placeholder={`SL${String(selectedDashakam).padStart(3, "0")}-${String(row.verse_no).padStart(2, "0")}.m4a`}
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="text" value={row.learn_audio_file} onChange={(e) => updateField(row.verse_no, "learn_audio_file", e.target.value)}
                              placeholder={`SL${String(selectedDashakam).padStart(3, "0")}-${String(row.verse_no).padStart(2, "0")}_Learn.m4a`}
                              className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={row.has_bell} onChange={(e) => updateField(row.verse_no, "has_bell", e.target.checked)} className="h-4 w-4 rounded border-input text-secondary accent-secondary" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input type="checkbox" checked={row.has_sloka} onChange={(e) => updateField(row.verse_no, "has_sloka", e.target.checked)} className="h-4 w-4 rounded border-input text-secondary accent-secondary" />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => saveRow(row)} disabled={!row.dirty || saving === row.verse_no}
                              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors ${row.dirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                              <Save className="h-3 w-3" />{saving === row.verse_no ? "…" : "Save"}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded sub-rows */}
                        {expandedVerse === row.verse_no && (
                          <>
                            {/* Script sub-row */}
                            <tr className="border-t border-dashed border-border bg-muted/30">
                              <td className="px-3 py-3" colSpan={6}>
                                <div className="flex items-center gap-2 mb-2"><FileText className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-primary uppercase tracking-wide">Sanskrit Script</span></div>
                                <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Sanskrit Script</label>
                                    <textarea value={row.sanskrit_text} onChange={(e) => updateField(row.verse_no, "sanskrit_text", e.target.value)} rows={3}
                                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs font-serif focus:ring-1 focus:ring-ring resize-y" placeholder="Enter Sanskrit verse text…" />
                                  </div>
                                  <div className="w-full md:w-40">
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Meter</label>
                                    <input type="text" value={row.meter} onChange={(e) => updateField(row.verse_no, "meter", e.target.value)}
                                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" placeholder="e.g. Anushtubh" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={row.has_bell} onChange={(e) => updateField(row.verse_no, "has_bell", e.target.checked)} className="h-4 w-4 rounded border-input text-secondary accent-secondary" />
                                    <label className="text-xs text-muted-foreground">Bell</label>
                                  </div>
                                  <button onClick={() => saveScript(row)} disabled={!row.scriptDirty || savingScript === row.verse_no}
                                    className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${row.scriptDirty ? "bg-primary text-primary-foreground hover:bg-primary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                                    <Save className="h-3 w-3" />{savingScript === row.verse_no ? "…" : "Save Script"}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Language content sub-row */}
                            <tr className="border-t border-dashed border-border bg-card/50">
                              <td className="px-3 py-3" colSpan={6}>
                                <div className="flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-secondary" /><span className="text-xs font-semibold text-secondary uppercase tracking-wide">Language Content</span></div>
                                <div className="flex gap-1 mb-4">
                                  {LANGUAGES.map((lang) => {
                                    const hasContent = langExistence[String(row.verse_no)]?.has(lang.code);
                                    const isActive = row.activeLang === lang.code;
                                    return (
                                      <button key={lang.code} onClick={() => setActiveLang(row.verse_no, lang.code)}
                                        className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                        <span className={`h-2 w-2 rounded-full ${hasContent ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />{lang.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {(() => {
                                  const lang = row.activeLang; const lc = row.langContent[lang]; const langKey = `${row.verse_no}-${lang}`;
                                  return (
                                    <div className="space-y-3">
                                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Transliteration ({lang.toUpperCase()})</label>
                                        <textarea value={lc.transliteration_text} onChange={(e) => updateLangField(row.verse_no, lang, "transliteration_text", e.target.value)} rows={3}
                                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} transliteration…`} /></div>
                                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Translation / Meaning ({lang.toUpperCase()})</label>
                                        <textarea value={lc.translation_text} onChange={(e) => updateLangField(row.verse_no, lang, "translation_text", e.target.value)} rows={3}
                                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} translation…`} /></div>
                                      <div className="max-w-md"><label className="block text-xs font-medium text-muted-foreground mb-1">Prasadam ({lang.toUpperCase()})</label>
                                        <input type="text" value={lc.prasadam_text} onChange={(e) => updateLangField(row.verse_no, lang, "prasadam_text", e.target.value)}
                                          className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" placeholder="Prasadam text…" /></div>
                                      <div className="flex justify-end">
                                        <button onClick={() => saveLangContent(row, lang)} disabled={!lc.dirty || savingLang === langKey}
                                          className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${lc.dirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                                          <Save className="h-3 w-3" />{savingLang === langKey ? "…" : `Save ${lang.toUpperCase()}`}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                            </tr>

                            {/* Sloka sub-row */}
                            {row.has_sloka && (
                              <tr className="border-t border-dashed border-border bg-primary/5">
                                <td className="px-3 py-3" colSpan={6}>
                                  <div className="flex items-center gap-2 mb-3"><BookOpen className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-primary uppercase tracking-wide">Sloka Configuration</span></div>
                                  <div className="flex flex-col gap-3 md:flex-row md:items-end">
                                    <div className="w-full md:w-32"><label className="block text-xs font-medium text-muted-foreground mb-1">Sloka Number</label>
                                      <input type="number" min={1} value={row.sloka.sloka_num || ""} onChange={(e) => updateVerseSlokaField(row.verse_no, "sloka_num", Number(e.target.value))}
                                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                                    <div className="w-full md:w-32"><label className="block text-xs font-medium text-muted-foreground mb-1">Sloka Verse #</label>
                                      <input type="number" min={1} value={row.sloka.sloka_verse || ""} onChange={(e) => updateVerseSlokaField(row.verse_no, "sloka_verse", Number(e.target.value))}
                                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                                    <div className="flex items-center gap-2">
                                      <label className="text-xs text-muted-foreground">Auto Play</label>
                                      <button onClick={() => updateVerseSlokaField(row.verse_no, "auto_play", !row.sloka.auto_play)}
                                        className={`relative h-5 w-9 rounded-full transition-colors ${row.sloka.auto_play ? "bg-primary" : "bg-muted"}`}>
                                        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${row.sloka.auto_play ? "translate-x-4" : ""}`} />
                                      </button>
                                    </div>
                                    <button onClick={() => saveVerseSloka(row)} disabled={!row.sloka.dirty || savingSloka === row.verse_no}
                                      className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${row.sloka.dirty ? "bg-primary text-primary-foreground hover:bg-primary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                                      <Save className="h-3 w-3" />{savingSloka === row.verse_no ? "…" : "Save Sloka"}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ═══ SLOKAS TAB ═══ */}
      {/* ══════════════════════════════════════════ */}
      {topTab === "slokas" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-lg font-semibold text-foreground">All Slokas</h2>
            <button onClick={() => openSlokaEdit()} className="inline-flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Plus className="h-4 w-4" /> Add New Sloka
            </button>
          </div>

          {/* Sloka list table */}
          <div className="overflow-x-auto rounded-lg border border-border mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Sloka #</th>
                  <th className="px-3 py-2 text-left font-medium">Verse #</th>
                  <th className="px-3 py-2 text-center font-medium">Auto Play</th>
                  <th className="px-3 py-2 text-center font-medium">Languages</th>
                  <th className="px-3 py-2 text-center font-medium">Audio</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Edit</th>
                </tr>
              </thead>
              <tbody>
                {slokaList.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No slokas found. Click "Add New Sloka" to create one.</td></tr>
                )}
                {slokaList.map((s) => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground">{s.sloka_num}</td>
                    <td className="px-3 py-2 text-foreground">{s.sloka_verse}</td>
                    <td className="px-3 py-2 text-center">{s.auto_play ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</td>
                    <td className="px-3 py-2 text-center"><span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.lang_count > 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{s.lang_count}/7</span></td>
                    <td className="px-3 py-2 text-center">{s.has_audio ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openSlokaEdit(s)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sloka Edit Form */}
          {slokaEdit && (
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-foreground">{slokaEdit.id ? "Edit Sloka" : "New Sloka"}</h3>
                <button onClick={() => setSlokaEdit(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
              </div>

              {/* Audio Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3"><Music className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-primary uppercase tracking-wide">Audio & Position</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Sloka Number</label>
                      <input type="number" min={1} value={slokaEdit.sloka_num || ""} onChange={(e) => setSlokaEdit((f) => f ? { ...f, sloka_num: Number(e.target.value), audioDirty: true } : f)}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                    <div><label className="block text-xs font-medium text-muted-foreground mb-1">Sloka Verse</label>
                      <input type="number" min={1} value={slokaEdit.sloka_verse || ""} onChange={(e) => setSlokaEdit((f) => f ? { ...f, sloka_verse: Number(e.target.value), audioDirty: true } : f)}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted-foreground">Auto Play</label>
                    <button onClick={() => setSlokaEdit((f) => f ? { ...f, auto_play: !f.auto_play, audioDirty: true } : f)}
                      className={`relative h-5 w-9 rounded-full transition-colors ${slokaEdit.auto_play ? "bg-primary" : "bg-muted"}`}>
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${slokaEdit.auto_play ? "translate-x-4" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Chant Audio File</label>
                    <input type="text" value={slokaEdit.chant_audio_file} onChange={(e) => setSlokaEdit((f) => f ? { ...f, chant_audio_file: e.target.value, audioDirty: true } : f)}
                      placeholder="SL001-02_Sloka03_04.m4a" className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Learn Audio File</label>
                    <input type="text" value={slokaEdit.learn_audio_file} onChange={(e) => setSlokaEdit((f) => f ? { ...f, learn_audio_file: e.target.value, audioDirty: true } : f)}
                      placeholder="SL001-02_Sloka03_04_Learn.m4a" className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">After Dashakam #</label>
                    <input type="number" min={1} max={100} value={slokaEdit.after_dashakam_no || ""} onChange={(e) => setSlokaEdit((f) => f ? { ...f, after_dashakam_no: Number(e.target.value), audioDirty: true } : f)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">After Verse #</label>
                    <input type="number" min={1} value={slokaEdit.after_verse_no || ""} onChange={(e) => setSlokaEdit((f) => f ? { ...f, after_verse_no: Number(e.target.value), audioDirty: true } : f)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                </div>
                <div className="flex justify-end">
                  <button onClick={saveSlokaAudio} disabled={!slokaEdit.audioDirty || savingSlokaAudio}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${slokaEdit.audioDirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                    <Save className="h-4 w-4" />{savingSlokaAudio ? "Saving…" : "Save Audio"}
                  </button>
                </div>
              </div>

              {/* Language Content */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-secondary" /><span className="text-xs font-semibold text-secondary uppercase tracking-wide">Language Content</span></div>
                <div className="flex gap-1 mb-4">
                  {LANGUAGES.map((lang) => {
                    const hasContent = slokaEdit.langExistence.has(lang.code);
                    const isActive = slokaEdit.activeLang === lang.code;
                    return (
                      <button key={lang.code} onClick={() => setSlokaEdit((f) => f ? { ...f, activeLang: lang.code } : f)}
                        className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        <span className={`h-2 w-2 rounded-full ${hasContent ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />{lang.label}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const lang = slokaEdit.activeLang;
                  const lc = slokaEdit.langContent[lang];
                  return (
                    <div className="space-y-3">
                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Transliteration ({lang.toUpperCase()})</label>
                        <textarea value={lc.transliteration_text} onChange={(e) => setSlokaEdit((f) => { if (!f) return f; const u = { ...f, langContent: { ...f.langContent } }; u.langContent[lang] = { ...f.langContent[lang], transliteration_text: e.target.value, dirty: true }; return u; })}
                          rows={3} className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} transliteration…`} /></div>
                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Translation ({lang.toUpperCase()})</label>
                        <textarea value={lc.translation_text} onChange={(e) => setSlokaEdit((f) => { if (!f) return f; const u = { ...f, langContent: { ...f.langContent } }; u.langContent[lang] = { ...f.langContent[lang], translation_text: e.target.value, dirty: true }; return u; })}
                          rows={3} className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} translation…`} /></div>
                      <div className="flex justify-end">
                        <button onClick={() => saveSlokaLangContent(lang)} disabled={!lc.dirty || savingSlokaLang === lang}
                          className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${lc.dirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                          <Save className="h-3 w-3" />{savingSlokaLang === lang ? "…" : `Save ${lang.toUpperCase()}`}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* ═══ RITUAL CHANTS TAB ═══ */}
      {/* ══════════════════════════════════════════ */}
      {topTab === "rituals" && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-6">Ritual Chants</h2>

          <div className="overflow-x-auto rounded-lg border border-border mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Chant Key</th>
                  <th className="px-3 py-2 text-left font-medium">Trigger Point</th>
                  <th className="px-3 py-2 text-center font-medium">Order</th>
                  <th className="px-3 py-2 text-center font-medium">Audio</th>
                  <th className="px-3 py-2 text-center font-medium w-20">Edit</th>
                </tr>
              </thead>
              <tbody>
                {ritualList.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No ritual chants found.</td></tr>
                )}
                {ritualList.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="px-3 py-2 font-medium text-foreground">{r.chant_key}</td>
                    <td className="px-3 py-2 text-foreground"><span className="inline-flex rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-foreground">{r.trigger_point}</span></td>
                    <td className="px-3 py-2 text-center text-foreground">{r.display_order}</td>
                    <td className="px-3 py-2 text-center">{r.chant_audio_file ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground mx-auto" />}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => openRitualEdit(r)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Ritual Edit Form */}
          {ritualEdit && (
            <section className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-semibold text-foreground">Edit: {ritualEdit.chant_key}</h3>
                <button onClick={() => setRitualEdit(null)} className="text-xs text-muted-foreground hover:text-foreground">✕ Close</button>
              </div>

              {/* Audio */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3"><Music className="h-4 w-4 text-primary" /><span className="text-xs font-semibold text-primary uppercase tracking-wide">Audio</span></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Chant Audio File</label>
                    <input type="text" value={ritualEdit.chant_audio_file} onChange={(e) => setRitualEdit((f) => f ? { ...f, chant_audio_file: e.target.value, audioDirty: true } : f)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                  <div><label className="block text-xs font-medium text-muted-foreground mb-1">Learn Audio File</label>
                    <input type="text" value={ritualEdit.learn_audio_file} onChange={(e) => setRitualEdit((f) => f ? { ...f, learn_audio_file: e.target.value, audioDirty: true } : f)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring" /></div>
                </div>
                <div className="flex justify-end">
                  <button onClick={saveRitualAudio} disabled={!ritualEdit.audioDirty || savingRitualAudio}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${ritualEdit.audioDirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                    <Save className="h-4 w-4" />{savingRitualAudio ? "Saving…" : "Save Audio"}
                  </button>
                </div>
              </div>

              {/* Language Content */}
              <div>
                <div className="flex items-center gap-2 mb-3"><Globe className="h-4 w-4 text-secondary" /><span className="text-xs font-semibold text-secondary uppercase tracking-wide">Language Content</span></div>
                <div className="flex gap-1 mb-4">
                  {LANGUAGES.map((lang) => {
                    const hasContent = ritualEdit.langExistence.has(lang.code);
                    const isActive = ritualEdit.activeLang === lang.code;
                    return (
                      <button key={lang.code} onClick={() => setRitualEdit((f) => f ? { ...f, activeLang: lang.code } : f)}
                        className={`relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${isActive ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                        <span className={`h-2 w-2 rounded-full ${hasContent ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />{lang.label}
                      </button>
                    );
                  })}
                </div>
                {(() => {
                  const lang = ritualEdit.activeLang;
                  const lc = ritualEdit.langContent[lang];
                  return (
                    <div className="space-y-3">
                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Transliteration ({lang.toUpperCase()})</label>
                        <textarea value={lc.transliteration_text} onChange={(e) => setRitualEdit((f) => { if (!f) return f; const u = { ...f, langContent: { ...f.langContent } }; u.langContent[lang] = { ...f.langContent[lang], transliteration_text: e.target.value, dirty: true }; return u; })}
                          rows={3} className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} transliteration…`} /></div>
                      <div><label className="block text-xs font-medium text-muted-foreground mb-1">Translation ({lang.toUpperCase()})</label>
                        <textarea value={lc.translation_text} onChange={(e) => setRitualEdit((f) => { if (!f) return f; const u = { ...f, langContent: { ...f.langContent } }; u.langContent[lang] = { ...f.langContent[lang], translation_text: e.target.value, dirty: true }; return u; })}
                          rows={3} className="w-full rounded border border-input bg-background px-2 py-1 text-xs focus:ring-1 focus:ring-ring resize-y" placeholder={`Enter ${lang.toUpperCase()} translation…`} /></div>
                      <div className="flex justify-end">
                        <button onClick={() => saveRitualLang(lang)} disabled={!lc.dirty || savingRitualLang === lang}
                          className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors ${lc.dirty ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                          <Save className="h-3 w-3" />{savingRitualLang === lang ? "…" : `Save ${lang.toUpperCase()}`}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
