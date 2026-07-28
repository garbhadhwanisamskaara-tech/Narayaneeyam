import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashakamSets } from "@/hooks/useDashakamSets";
import { useGroupMembers } from "@/hooks/useGroups";
import { buildSchedule } from "@/hooks/useParayanamSchedule";
import SEO from "@/components/SEO";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const ALL = Array.from({ length: 100 }, (_, i) => i + 1);

export default function CreateParayanamPage() {
  const [params] = useSearchParams();
  const groupId = params.get("group") ?? undefined;
  const isGroup = !!groupId;
  const { user } = useAuth();
  const navigate = useNavigate();

  const { sets, loading: loadingSets } = useDashakamSets();
  const { members } = useGroupMembers(groupId, null);

  const [step, setStep] = useState(1);
  const [setId, setSetId] = useState<string>("");
  const [custom, setCustom] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(99));
  const [distribution, setDistribution] = useState<"auto" | "manual">("auto");
  const [manualAssign, setManualAssign] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setId && sets.length) setSetId(sets[0].id);
  }, [sets, setId]);

  const orderedSets = useMemo(
    () => [...sets].sort((a, b) => Number(b.is_official) - Number(a.is_official)),
    [sets]
  );
  const selectedSet = sets.find((s) => s.id === setId);
  const dashakams = setId === "custom" ? [...custom].sort((a, b) => a - b) : selectedSet?.dashakam_list ?? [];
  const memberIds = members.map((m) => m.user_id);

  // Date-spread preview (assignment resolved at submit time)
  const planned = useMemo(
    () =>
      dashakams.length && endDate >= startDate
        ? buildSchedule(dashakams, startDate, endDate, "synchronized", [])
        : [],
    [dashakams, startDate, endDate]
  );

  const keyFor = (date: string, no: number) => `${date}#${no}`;

  const toggleCustom = (n: number) =>
    setCustom((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  const canNext =
    step === 1
      ? dashakams.length > 0
      : step === 2
        ? !!startDate && !!endDate && endDate >= startDate
        : true;

  const handleSubmit = async () => {
    if (!user || dashakams.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const { data: session, error: sErr } = await (supabase as any)
        .from("challenge_sessions")
        .insert({
          user_id: user.id,
          group_id: groupId ?? null,
          mode: "chant",
          challenge_type: isGroup ? "group" : "personal",
          start_date: startDate,
          end_date: endDate,
          technical_state: "ACTIVE",
          spiritual_state: "in_progress",
          dashakams_target: dashakams.length,
          dashakam_list: dashakams,
          dashakam_set_id: setId === "custom" ? null : setId,
        })
        .select("id")
        .single();
      if (sErr) throw new Error(sErr.message);

      const rows = planned.map((p, i) => {
        let assigned: string | null = user.id;
        if (isGroup) {
          assigned =
            distribution === "manual"
              ? manualAssign[keyFor(p.scheduled_date, p.dashakam_no)] ?? null
              : memberIds.length
                ? memberIds[i % memberIds.length]
                : null;
        }
        return {
          challenge_session_id: session.id,
          dashakam_no: p.dashakam_no,
          scheduled_date: p.scheduled_date,
          assigned_user_id: assigned,
          is_manual_override: isGroup && distribution === "manual",
        };
      });

      const { error: schErr } = await (supabase as any).from("parayanam_schedule").insert(rows);
      if (schErr) throw new Error(schErr.message);

      if (isGroup) {
        const { data: g } = await (supabase as any)
          .from("groups")
          .select("active_challenge_session_id")
          .eq("id", groupId)
          .maybeSingle();
        if (g && !g.active_challenge_session_id) {
          await (supabase as any)
            .from("groups")
            .update({ active_challenge_session_id: session.id })
            .eq("id", groupId);
        }
        navigate(`/groups/${groupId}`);
      } else {
        navigate("/progress");
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not create the parayanam.");
    } finally {
      setBusy(false);
    }
  };

  const lastStep = isGroup ? 3 : 2;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
      <SEO
        path="/parayanam/new"
        title="Create a Parayanam — Sriman Narayaneeyam"
        description="Choose a dashakam set, set your dates and begin a personal or group parayanam."
      />
      <Link
        to={isGroup ? `/groups/${groupId}` : "/progress"}
        className="inline-flex items-center gap-1 font-sans text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">Create a Parayanam</h1>
      <p className="font-sans text-sm text-muted-foreground">
        Step {step} of {lastStep}
      </p>

      <section className="mt-6 space-y-5 rounded-2xl border border-border bg-card p-5">
        {step === 1 && (
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">Choose a dashakam set</p>
            {loadingSets ? (
              <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
            ) : (
              <div className="mt-3 space-y-2">
                {orderedSets.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSetId(s.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-colors ${
                      setId === s.id ? "border-primary bg-secondary/30" : "border-border hover:border-primary"
                    }`}
                  >
                    <span className="font-sans text-sm font-semibold text-foreground">
                      {s.set_name}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({s.dashakam_list.length} dashakams{s.is_official ? "" : " · yours"})
                      </span>
                    </span>
                    {s.description && (
                      <span className="mt-1 block font-sans text-xs text-muted-foreground">{s.description}</span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setSetId("custom")}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    setId === "custom" ? "border-primary bg-secondary/30" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="font-sans text-sm font-semibold text-foreground">Custom selection</span>
                  <span className="mt-1 block font-sans text-xs text-muted-foreground">
                    Pick the dashakams yourself.
                  </span>
                </button>
              </div>
            )}

            {setId === "custom" && (
              <div className="mt-4 grid grid-cols-10 gap-1.5">
                {ALL.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleCustom(n)}
                    className={`aspect-square rounded-md border font-sans text-[11px] font-semibold transition-colors ${
                      custom.includes(n)
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-3 font-sans text-xs text-muted-foreground">{dashakams.length} dashakams selected</p>
          </div>
        )}

        {step === 2 && (
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
            {endDate < startDate && (
              <p className="font-sans text-xs text-destructive sm:col-span-2">
                The end date must be on or after the start date.
              </p>
            )}
          </div>
        )}

        {step === 3 && isGroup && (
          <div>
            <p className="font-sans text-sm font-semibold text-foreground">How should dashakams be shared?</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["auto", "Auto-distribute evenly", "Round-robin across members and days."],
                  ["manual", "Assign manually", "Choose a member for each dashakam."],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  onClick={() => setDistribution(value)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    distribution === value ? "border-primary bg-secondary/30" : "border-border hover:border-primary"
                  }`}
                >
                  <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
                  <span className="mt-1 block font-sans text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>

            {distribution === "manual" && (
              <div className="mt-5 max-h-96 space-y-2 overflow-y-auto pr-1">
                {planned.map((p) => (
                  <div
                    key={keyFor(p.scheduled_date, p.dashakam_no)}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="font-sans text-xs text-foreground">
                      {p.scheduled_date} · Dashakam {p.dashakam_no}
                    </span>
                    <select
                      aria-label={`Assign dashakam ${p.dashakam_no}`}
                      value={manualAssign[keyFor(p.scheduled_date, p.dashakam_no)] ?? ""}
                      onChange={(e) =>
                        setManualAssign((prev) => ({
                          ...prev,
                          [keyFor(p.scheduled_date, p.dashakam_no)]: e.target.value,
                        }))
                      }
                      className="rounded-lg border border-border bg-background px-2 py-1 font-sans text-xs text-foreground"
                    >
                      <option value="">Everyone</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && <p className="font-sans text-sm text-destructive">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
            className="rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground disabled:opacity-40"
          >
            Back
          </button>
          {step < lastStep ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="rounded-lg bg-gradient-gold px-5 py-2 font-sans text-sm font-semibold text-primary shadow-gold disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={busy || !canNext || dashakams.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-5 py-2 font-sans text-sm font-semibold text-primary shadow-gold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Begin Parayanam
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
