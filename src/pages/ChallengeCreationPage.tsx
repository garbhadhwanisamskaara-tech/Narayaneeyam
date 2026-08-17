import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Copy, Loader2, Sparkles, Sprout } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashakamSets, type DashakamSet } from "@/hooks/useDashakamSets";
import { prefetchDashakamList } from "@/hooks/useDashakam";
import { useParayanamSchedule } from "@/hooks/useParayanamSchedule";
import BudGrid from "@/components/BudGrid";
import SEO from "@/components/SEO";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Personal parayanam creation — same flow as the group schedule page, minus group options. */
export default function ChallengeCreationPage() {
  const { user } = useAuth();

  const [setId, setSetId] = useState<string>("");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(99));
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { sets, loading: loadingSets, forkSet } = useDashakamSets();
  const { rows, loading: loadingRows, generate } = useParayanamSchedule(sessionId);

  useEffect(() => {
    if (!setId && sets.length) setSetId(sets[0].id);
  }, [sets, setId]);

  const selectedSet: DashakamSet | undefined = useMemo(
    () => sets.find((s) => s.id === setId),
    [sets, setId]
  );

  const [readyList, setReadyList] = useState<number[] | null>(null);
  useEffect(() => {
    prefetchDashakamList()
      .then((list) => setReadyList(list.filter((d) => d.is_published).map((d) => d.dashakam_no)))
      .catch(() => {});
  }, []);

  const notReady = useMemo(() => {
    if (!readyList || !selectedSet) return [];
    const ready = new Set(readyList);
    return selectedSet.dashakam_list.filter((n) => !ready.has(n));
  }, [readyList, selectedSet]);

  const handleFork = async () => {
    if (!selectedSet) return;
    setBusy(true);
    setError(null);
    try {
      const copy = await forkSet(selectedSet, `${selectedSet.set_name} (mine)`);
      setSetId(copy.id);
      setNotice(`Created "${copy.set_name}" — this copy is yours to edit.`);
    } catch (e: any) {
      setError(e?.message ?? "Could not customize this set.");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !selectedSet) return;
    if (endDate < startDate) {
      setError("The end date must be on or after the start date.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const sessionPayload = {
        user_id: user.id,
        mode: "daily",
        challenge_type: "personal",
        start_date: startDate,
        end_date: endDate,
        technical_state: "ACTIVE",
        spiritual_state: "in_progress",
        dashakams_target: selectedSet.dashakam_list.length,
        dashakam_list: selectedSet.dashakam_list,
        dashakam_set_id: selectedSet.id,
      };

      let id = sessionId;
      if (id) {
        const { error: upErr } = await (supabase as any)
          .from("challenge_sessions")
          .update(sessionPayload)
          .eq("id", id);
        if (upErr) throw new Error(upErr.message);
      } else {
        const { data, error: insErr } = await (supabase as any)
          .from("challenge_sessions")
          .insert(sessionPayload)
          .select("id")
          .single();
        if (insErr) throw new Error(insErr.message);
        id = data.id as string;
        setSessionId(id);
      }

      // "split" across a single member list of just me → every row assigned to me.
      await generate(id!, selectedSet.dashakam_list, startDate, endDate, "split", [user.id]);
      setNotice("Your parayanam is ready. Tap a bud below as you complete each dashakam.");
    } catch (e: any) {
      setError(e?.message ?? "Could not create your parayanam.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <SEO
        path="/challenges/new"
        title="Start a Parayanam — Sriman Narayaneeyam"
        description="Choose a dashakam set and a timeline for your personal Narayaneeyam parayanam."
      />
      <Link
        to="/progress"
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> My progress
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Start a Parayanam</h1>
      <p className="mt-1 font-sans text-sm text-muted-foreground">
        Pick a dashakam set and the days you would like to chant it over.
      </p>

      <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5 shadow-peacock">
        <div>
          <label htmlFor="set" className="font-sans text-sm font-semibold text-foreground">
            Dashakam set
          </label>
          {loadingSets ? (
            <Loader2 className="mt-2 h-5 w-5 animate-spin text-primary" />
          ) : (
            <select
              id="set"
              value={setId}
              onChange={(e) => setSetId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.set_name} ({s.dashakam_list.length} dashakams)
                  {s.is_official ? "" : " · yours"}
                </option>
              ))}
            </select>
          )}
          {selectedSet?.description && (
            <p className="mt-2 font-sans text-xs text-muted-foreground">{selectedSet.description}</p>
          )}
          {selectedSet?.is_official && (
            <button
              onClick={handleFork}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 font-sans text-xs font-semibold text-foreground hover:border-primary disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" /> Make my own copy
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="start" className="font-sans text-sm font-semibold text-foreground">
              Start date
            </label>
            <input
              id="start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label htmlFor="end" className="font-sans text-sm font-semibold text-foreground">
              End date
            </label>
            <input
              id="end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={busy || !selectedSet || notReady.length > 0}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-peacock px-4 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {rows.length ? "Regenerate parayanam" : "Create my parayanam"}
        </button>

        {notReady.length > 0 && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 font-sans text-xs text-destructive">
            These dashakams are still being recorded: {notReady.join(", ")}. Please choose another set so your
            parayanam does not hit a gap partway through.
          </p>
        )}
        {error && <p className="font-sans text-sm text-destructive">{error}</p>}
        {notice && <p className="font-sans text-sm text-primary">{notice}</p>}
      </section>

      {sessionId && (
        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Sprout className="h-5 w-5 text-secondary" /> Parayanam Progress
          </h2>
          {loadingRows ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <BudGrid challengeSessionId={sessionId} parayanamName={selectedSet?.set_name} />
          )}
        </section>
      )}
    </div>
  );
}
