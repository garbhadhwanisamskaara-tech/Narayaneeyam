import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDashakamSets } from "@/hooks/useDashakamSets";
import { useParayanamTemplates } from "@/hooks/useParayanamTemplates";
import { prefetchDashakamList } from "@/hooks/useDashakam";
import { useGroupMembers } from "@/hooks/useGroups";
import { buildSchedule } from "@/hooks/useParayanamSchedule";
import { inviteParticipants } from "@/hooks/useParayanamParticipants";
import ParticipantPicker from "@/components/ParticipantPicker";
import SEO from "@/components/SEO";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};


export default function CreateParayanamPage() {
  const [params] = useSearchParams();
  const groupId = params.get("group") ?? undefined;
  const isGroup = !!groupId;
  const { user } = useAuth();
  const navigate = useNavigate();

  const { sets, loading: loadingSets } = useDashakamSets();
  const { templates, loading: loadingTemplates } = useParayanamTemplates();
  const { members } = useGroupMembers(groupId, null);

  const [step, setStep] = useState(1);
  const [parayanamName, setParayanamName] = useState("");
  const [setId, setSetId] = useState<string>("");
  const [custom, setCustom] = useState<number[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("scratch");
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(99));
  const [distribution, setDistribution] = useState<"synchronized" | "split">("synchronized");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloWarning, setSoloWarning] = useState(false);
  const [allDashakams, setAllDashakams] = useState<
    { dashakam_no: number; dashakam_name: string; is_published: boolean }[]
  >([]);

  useEffect(() => {
    prefetchDashakamList()
      .then((list) =>
        setAllDashakams(
          list.map((d) => ({
            dashakam_no: d.dashakam_no,
            dashakam_name: d.dashakam_name,
            is_published: d.is_published,
          }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!setId && sets.length) setSetId(sets[0].id);
  }, [sets, setId]);

  useEffect(() => {
    if (!user) return;
    setSelectedParticipants((prev) =>
      prev.length ? prev : members.map((m) => m.user_id).filter((id) => id !== user.id)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, user?.id]);

  const orderedSets = useMemo(
    () => [...sets].sort((a, b) => Number(b.is_official) - Number(a.is_official)),
    [sets]
  );
  const selectedSet = sets.find((s) => s.id === setId);
  const dashakams = setId === "custom" ? [...custom].sort((a, b) => a - b) : selectedSet?.dashakam_list ?? [];
  const templateLocked = selectedTemplateId !== "scratch";

  // Date-spread preview (assignment resolved at submit time)
  const planned = useMemo(
    () =>
      dashakams.length && endDate >= startDate
        ? buildSchedule(dashakams, startDate, endDate, "synchronized", [])
        : [],
    [dashakams, startDate, endDate]
  );

  const toggleCustom = (n: number) =>
    setCustom((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));

  /** Selecting a template REPLACES the whole selection state. */
  const applyTemplate = (templateId: string) => {
    if (templateId === "scratch") {
      setSelectedTemplateId("scratch");
      setCustom([]);
      setSetId("custom");
      return;
    }
    const t = templates.find((tmpl) => tmpl.id === templateId);
    if (!t) return;
    setSelectedTemplateId(templateId);
    setSetId("custom");
    setCustom([...t.dashakam_list]);
    // Suggest the template name — the user can rename it (e.g. "Marriage Chennai Group").
    setParayanamName((prev) =>
      !prev.trim() || templates.some((tmpl) => tmpl.template_name === prev.trim()) ? t.template_name : prev
    );
  };


  /** Picking a predefined set or Custom also clears any active template. */
  const chooseSet = (id: string) => {
    setSelectedTemplateId("scratch");
    setSetId(id);
    if (id === "custom") setCustom([]);
  };

  const canNext =
    step === 1
      ? dashakams.length > 0
      : step === 2
        ? !!startDate && !!endDate && endDate >= startDate
        : true;


  const handleBegin = () => {
    if (isGroup && members.length <= 1 && !soloWarning) {
      setSoloWarning(true);
      return;
    }
    void handleSubmit();
  };

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
          parayanam_name: parayanamName.trim() || null,
          mode: "daily",
          challenge_type: isGroup
            ? distribution === "synchronized"
              ? "group_standard"
              : "group_relay"
            : "personal",
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
      track("parayanam_created");

      if (isGroup) {
        // No schedule rows here — finalize_parayanam() builds them on the start date.
        await inviteParticipants(session.id, selectedParticipants, includeSelf ? user.id : null);
      } else {
        const rows = planned.map((p) => ({
          challenge_session_id: session.id,
          dashakam_no: p.dashakam_no,
          scheduled_date: p.scheduled_date,
          assigned_user_id: user.id,
          is_manual_override: false,
        }));
        const { error: schErr } = await (supabase as any).from("parayanam_schedule").insert(rows);
        if (schErr) throw new Error(schErr.message);
      }

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
            <label htmlFor="parayanam-name" className="font-sans text-sm font-semibold text-foreground">
              Parayanam name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="parayanam-name"
              type="text"
              maxLength={80}
              value={parayanamName}
              onChange={(e) => setParayanamName(e.target.value)}
              placeholder="Diwali 2026 Parayanam"
              className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="font-sans text-sm font-semibold text-foreground">Start from a template</p>
              <p className="font-sans text-xs text-muted-foreground">
                Pick a shortcut to pre-fill your dashakams, or choose your own set below.
              </p>
              {loadingTemplates ? (
                <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyTemplate("scratch")}
                    className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
                      selectedTemplateId === "scratch"
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                    }`}
                  >
                    Start from scratch
                  </button>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.description ?? undefined}
                      onClick={() => applyTemplate(t.id)}
                      className={`rounded-full border px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
                        selectedTemplateId === t.id
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary hover:text-foreground"
                      }`}
                    >
                      {t.template_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {templateLocked ? (
              <div>
                <p className="font-sans text-sm font-semibold text-foreground">Dashakams in this template</p>
                <p className="font-sans text-xs text-muted-foreground">
                  These are fixed. Choose “Start from scratch” above to pick your own.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {dashakams.map((n) => (
                    <span
                      key={n}
                      title={allDashakams.find((d) => d.dashakam_no === n)?.dashakam_name}
                      className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 font-sans text-[11px] font-semibold text-primary"
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  {dashakams.length} dashakams in this parayanam
                </p>
              </div>
            ) : (
            <div>
              <p className="font-sans text-sm font-semibold text-foreground">Choose a dashakam set</p>
              {loadingSets ? (
                <Loader2 className="mt-3 h-5 w-5 animate-spin text-primary" />
              ) : (
                <div className="mt-3 space-y-2">
                  {orderedSets.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => chooseSet(s.id)}
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
                    onClick={() => chooseSet("custom")}
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
                  {allDashakams.map((d) => {
                    const picked = custom.includes(d.dashakam_no);
                    return (
                      <button
                        key={d.dashakam_no}
                        onClick={() => toggleCustom(d.dashakam_no)}
                        title={d.dashakam_name}
                        className={`aspect-square rounded-md border font-sans text-[11px] font-semibold transition-colors hover:border-primary ${
                          picked
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {d.dashakam_no}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 font-sans text-xs text-muted-foreground">{dashakams.length} dashakams selected</p>

            </div>
            )}

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
          <div className="space-y-5">
            <div>
              <p className="font-sans text-sm font-semibold text-foreground">How should dashakams be shared?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["synchronized", "Same Dashakam for everyone", ""],
                    ["split", "Dashakams split among participants", ""],
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
            </div>

            <ParticipantPicker
              members={members}
              ownerId={user?.id}
              selected={selectedParticipants}
              onToggle={(id) =>
                setSelectedParticipants((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
              includeSelf={includeSelf}
              onIncludeSelfChange={setIncludeSelf}
            />
          </div>
        )}

        {soloWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-sans text-sm text-amber-900 dark:text-amber-100">
              You're the only member in this group right now — this parayanam will run solo until others join. You can invite members from the group page.
            </p>
            <Link
              to={`/groups/${groupId}#invite`}
              className="mt-2 inline-block font-sans text-sm font-semibold text-primary hover:underline"
            >
              Invite members →
            </Link>
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
              onClick={soloWarning ? () => void handleSubmit() : handleBegin}
              disabled={busy || !canNext || dashakams.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-gold px-5 py-2 font-sans text-sm font-semibold text-primary shadow-gold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {soloWarning ? "Continue anyway" : isGroup ? "Save & invite" : "Begin Parayanam"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
