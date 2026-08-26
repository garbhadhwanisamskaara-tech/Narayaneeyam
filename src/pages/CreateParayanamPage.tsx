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
import { buildSchedule, contiguousBlocks, type DistributionMode } from "@/hooks/useParayanamSchedule";
import {
  parayanamDates,
  patternLabel,
  dayCountLabel,
  dayLine,
  shortDate,
  WEEKDAY_CHIP_ORDER,
  WEEKDAY_LABELS,
  type SchedulePattern,
} from "@/lib/parayanamDays";
import { inviteParticipants } from "@/hooks/useParayanamParticipants";
import ParticipantPicker from "@/components/ParticipantPicker";
import ParayanamModeSelector, { type DeliveryMode } from "@/components/ParayanamModeSelector";
import ParticipationTypeSelector, { type ParticipationType } from "@/components/ParticipationTypeSelector";
import ContributionDetailsForm, {
  isValidContributionAmount,
  isValidPaymentUrl,
  type ContributionDetails,
} from "@/components/ContributionDetailsForm";
import LiveScheduleEditor, {
  emptyLiveSchedule,
  generateSessions,
  isLiveScheduleValid,
  type LiveScheduleValue,
} from "@/components/LiveScheduleEditor";
import ParayanamReview from "@/components/ParayanamReview";
import SEO from "@/components/SEO";
import { toast } from "@/hooks/use-toast";

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
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("SELF_PACED");
  const [participationType, setParticipationType] = useState<ParticipationType>("FREE");
  const [contribution, setContribution] = useState<ContributionDetails>({
    amount: "",
    paymentUrl: "",
    note: "",
  });
  const [liveSchedule, setLiveSchedule] = useState<LiveScheduleValue>(emptyLiveSchedule());
  const [groupName, setGroupName] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(plusDays(99));
  const [distribution, setDistribution] = useState<DistributionMode>("SAME_FOR_ALL");
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>("DAILY");
  const [weekdays, setWeekdays] = useState<number[]>([]);
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
          })),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!groupId) return;
    (supabase as any)
      .from("groups")
      .select("group_name")
      .eq("id", groupId)
      .maybeSingle()
      .then(({ data }: any) => setGroupName(data?.group_name ?? null));
  }, [groupId]);

  useEffect(() => {
    if (!setId && sets.length) setSetId(sets[0].id);
  }, [sets, setId]);

  useEffect(() => {
    if (!user) return;
    setSelectedParticipants((prev) =>
      prev.length ? prev : members.map((m) => m.user_id).filter((id) => id !== user.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, user?.id]);

  const orderedSets = useMemo(() => [...sets].sort((a, b) => Number(b.is_official) - Number(a.is_official)), [sets]);
  const selectedSet = sets.find((s) => s.id === setId);
  const dashakams = setId === "custom" ? [...custom].sort((a, b) => a - b) : (selectedSet?.dashakam_list ?? []);
  const templateLocked = selectedTemplateId !== "scratch";
  const invitedCount = selectedParticipants.length + (includeSelf ? 1 : 0);
  const mode: DistributionMode = isGroup ? distribution : "SAME_FOR_ALL";

  /** The days this parayanam is actually conducted on. */
  const dates = useMemo(
    () => parayanamDates(startDate, endDate, schedulePattern, weekdays),
    [startDate, endDate, schedulePattern, weekdays],
  );

  /** Allocation over the actual parayanam days (assignment resolved at finalisation). */
  const planned = useMemo(() => buildSchedule(dashakams, dates, mode, []), [dashakams, dates, mode]);

  /** Preview grouped by parayanam day. */
  const previewDays = useMemo(
    () =>
      dates.map((date, i) => ({
        date,
        label: dayLine(i, date),
        dashakams:
          mode === "RELAY" || mode === "REPEAT_SAME"
            ? dashakams
            : planned.filter((r) => r.scheduled_date === date).map((r) => r.dashakam_no),
        blocks:
          mode === "RELAY" && invitedCount > 0
            ? contiguousBlocks(dashakams, invitedCount).map((block, b) => ({
                block,
                memberIndex: (b + i) % invitedCount,
              }))
            : [],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dates, planned, dashakams, mode, selectedParticipants.length, includeSelf],
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
      !prev.trim() || templates.some((tmpl) => tmpl.template_name === prev.trim()) ? t.template_name : prev,
    );
  };

  /** Picking a predefined set or Custom also clears any active template. */
  const chooseSet = (id: string) => {
    setSelectedTemplateId("scratch");
    setSetId(id);
    if (id === "custom") setCustom([]);
  };

  const isLive = deliveryMode === "LIVE";

  /** Steps are dynamic: Contribution only for PAID, Live Schedule only for LIVE. */
  const stepIds = useMemo(
    () =>
      [
        "details",
        "mode",
        ...(participationType === "PAID" ? (["contribution"] as const) : []),
        ...(isGroup ? (["distribution"] as const) : []),
        ...(isLive ? (["live"] as const) : []),
        ...(isGroup ? (["participants"] as const) : []),
        "review",
      ] as string[],
    [participationType, isGroup, isLive],
  );
  const lastStep = stepIds.length;
  const currentStep = stepIds[Math.min(step, lastStep) - 1];

  useEffect(() => {
    if (step > lastStep) setStep(lastStep);
  }, [step, lastStep]);

  const contributionValid =
    isValidContributionAmount(contribution.amount) && isValidPaymentUrl(contribution.paymentUrl);

  const canNext =
    currentStep === "details"
      ? dashakams.length > 0 && !!startDate && !!endDate && endDate >= startDate && dates.length > 0
      : currentStep === "contribution"
        ? contributionValid
        : currentStep === "live"
          ? isLiveScheduleValid(liveSchedule)
          : true;

  /** Keep generated sessions in step with the parayanam's date range. */
  useEffect(() => {
    if (!isLive) return;
    setLiveSchedule((prev) =>
      prev.option === "individually" ? prev : { ...prev, sessions: generateSessions(prev, dates) },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, dates.join(",")]);

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
          delivery_mode: deliveryMode,
          participation_type: participationType,
          contribution_amount: participationType === "PAID" ? Number(contribution.amount) : null,
          payment_url: participationType === "PAID" ? contribution.paymentUrl.trim() : null,
          payment_note: participationType === "PAID" && contribution.note.trim() ? contribution.note.trim() : null,
          challenge_type: isGroup ? (mode === "RELAY" ? "group_relay" : "group_standard") : "personal",
          distribution_mode: mode,
          schedule_pattern: schedulePattern,
          schedule_weekdays: schedulePattern === "WEEKDAYS" ? weekdays : null,
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

      if (isLive && liveSchedule.sessions.length) {
        const toIso = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();
        const liveRows = liveSchedule.sessions.map((ls) => ({
          challenge_session_id: session.id,
          session_date: ls.session_date,
          start_datetime: toIso(ls.session_date, ls.start_time),
          end_datetime: toIso(ls.session_date, ls.end_time),
          meeting_url: ls.meeting_url,
          join_before_mins: ls.join_before_mins,
        }));
        const { error: lsErr } = await (supabase as any).from("live_sessions").insert(liveRows);
        if (lsErr) throw new Error(lsErr.message);
      }

      if (isGroup) {
        const { data: g } = await (supabase as any)
          .from("groups")
          .select("active_challenge_session_id")
          .eq("id", groupId)
          .maybeSingle();
        if (g && !g.active_challenge_session_id) {
          await (supabase as any).from("groups").update({ active_challenge_session_id: session.id }).eq("id", groupId);
        }
        toast({
          title: "Parayanam created",
          description: invitedCount
            ? "Invitations have gone out to the people you chose."
            : "You can invite people to it from the group page.",
        });
        navigate(`/groups/${groupId}?session=${session.id}`);
      } else {
        toast({ title: "Parayanam created", description: "Your parayanam is ready." });
        navigate("/progress");
      }
    } catch (e: any) {
      setError(e?.message ?? "Could not create the parayanam.");
    } finally {
      setBusy(false);
    }
  };

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
        {currentStep === "details" && (
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

        {currentStep === "details" && (
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
                            picked ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"
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

            <div>
              <p className="font-sans text-sm font-semibold text-foreground">Parayanam days</p>
              <p className="font-sans text-xs text-muted-foreground">When will this parayanam take place?</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["DAILY", "Every day", "Every date from the start date to the end date."],
                    [
                      "WEEKDAYS",
                      "Selected days of the week",
                      "Only the days of the week you choose, within your dates.",
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={schedulePattern === value}
                    onClick={() => setSchedulePattern(value)}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      schedulePattern === value
                        ? "border-primary bg-secondary/30"
                        : "border-border hover:border-primary"
                    }`}
                  >
                    <span className="font-sans text-sm font-semibold text-foreground">{label}</span>
                    <span className="mt-1 block font-sans text-xs text-muted-foreground">{hint}</span>
                  </button>
                ))}
              </div>

              {schedulePattern === "WEEKDAYS" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {WEEKDAY_CHIP_ORDER.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={weekdays.includes(d)}
                      onClick={() =>
                        setWeekdays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()))
                      }
                      className={`min-w-[56px] rounded-xl border px-3 py-2 font-sans text-sm font-semibold transition-colors ${
                        weekdays.includes(d)
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {WEEKDAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              )}

              {dates.length > 0 ? (
                <p className="mt-3 font-sans text-xs text-muted-foreground">
                  {dayCountLabel(dates.length)} ·{" "}
                  {dates
                    .slice(0, 6)
                    .map((d) => shortDate(d))
                    .join(", ")}
                  {dates.length > 6 ? ` … ${shortDate(dates[dates.length - 1])}` : ""}
                </p>
              ) : (
                <p className="mt-3 font-sans text-xs text-destructive">
                  {schedulePattern === "WEEKDAYS" && !weekdays.length
                    ? "Please choose at least one day of the week."
                    : "There are no such days inside these dates. Please widen the dates or choose other days."}
                </p>
              )}
            </div>
          </div>
        )}
        {currentStep === "mode" && (
          <div className="space-y-6">
            <ParayanamModeSelector value={deliveryMode} onChange={setDeliveryMode} />

            <ParticipationTypeSelector value={participationType} onChange={setParticipationType} />
          </div>
        )}

        {currentStep === "contribution" && <ContributionDetailsForm value={contribution} onChange={setContribution} />}
        {currentStep === "distribution" && (
          <div className="space-y-5">
            <div>
              <p className="font-sans text-sm font-semibold text-foreground">How should dashakams be shared?</p>
              <p className="font-sans text-xs text-muted-foreground">
                {dayCountLabel(dates.length)} · {patternLabel(schedulePattern, weekdays)}
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    [
                      "SAME_FOR_ALL",
                      "Same dashakams for everyone",
                      "The selected dashakams are spread across the parayanam days, and everyone reads the same ones each day.",
                    ],
                    [
                      "REPEAT_SAME",
                      "Everyone repeats the whole set",
                      "Every participant reads the entire selected set on every parayanam day.",
                    ],
                    [
                      "RELAY",
                      "Relay — split among participants",
                      "Each parayanam day the whole set is completed together, split into blocks that rotate among participants.",
                    ],
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

            <div>
              <p className="font-sans text-sm font-semibold text-foreground">Schedule preview</p>
              {mode === "RELAY" && (
                <p className="font-sans text-xs text-muted-foreground">
                  Based on the {invitedCount} {invitedCount === 1 ? "person" : "people"} you invite. The final
                  allocation is prepared when the parayanam begins, from those who have confirmed.
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {previewDays.slice(0, 8).map((d) => (
                  <li key={d.date} className="rounded-xl border border-border p-3">
                    <p className="font-sans text-xs font-semibold text-foreground">{d.label}</p>
                    {mode === "RELAY" && d.blocks.length ? (
                      <ul className="mt-1 space-y-0.5">
                        {d.blocks.map((b) => (
                          <li key={b.memberIndex} className="font-sans text-xs text-muted-foreground">
                            Participant {b.memberIndex + 1} → {b.block.join(", ") || "—"}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 font-sans text-xs text-muted-foreground">{d.dashakams.join(", ") || "—"}</p>
                    )}
                  </li>
                ))}
              </ul>
              {previewDays.length > 8 && (
                <p className="mt-2 font-sans text-xs text-muted-foreground">
                  Showing the first 8 of {previewDays.length} parayanam days.
                </p>
              )}
            </div>
          </div>
        )}

        {currentStep === "live" && <LiveScheduleEditor value={liveSchedule} onChange={setLiveSchedule} dates={dates} />}

        {currentStep === "participants" && (
          <div className="space-y-5">
            <ParticipantPicker
              members={members}
              ownerId={user?.id}
              selected={selectedParticipants}
              onToggle={(id) =>
                setSelectedParticipants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
              }
              includeSelf={includeSelf}
              onIncludeSelfChange={setIncludeSelf}
            />
          </div>
        )}

        {currentStep === "review" && (
          <ParayanamReview
            parayanamName={parayanamName}
            groupName={groupName}
            startDate={startDate}
            endDate={endDate}
            isSingleDay={dates.length === 1}
            scheduleLabel={patternLabel(schedulePattern, weekdays)}
            dayCount={dates.length}
            distributionLabel={
              isGroup
                ? mode === "SAME_FOR_ALL"
                  ? "Same dashakams for everyone"
                  : mode === "REPEAT_SAME"
                    ? "Everyone repeats the whole set"
                    : "Relay — split among participants"
                : undefined
            }
            deliveryMode={deliveryMode}
            isGroup={isGroup}
            invitedCount={selectedParticipants.length + (includeSelf ? 1 : 0)}
            live={
              isLive
                ? {
                    planLabel: liveSchedule.option === "scheduled" ? "On every parayanam day" : "Added individually",
                    startTime: liveSchedule.startTime,
                    endTime: liveSchedule.endTime,
                    sessionCount: liveSchedule.sessions.length,
                    hasMeetingLink: isLiveScheduleValid(liveSchedule),
                    joinBeforeMins: liveSchedule.joinBeforeMins,
                  }
                : undefined
            }
            contribution={
              participationType === "PAID"
                ? { amount: contribution.amount, hasPaymentLink: isValidPaymentUrl(contribution.paymentUrl) }
                : null
            }
          />
        )}

        {soloWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="font-sans text-sm text-amber-900 dark:text-amber-100">
              You're the only member in this group right now — this parayanam will run solo until others join. You can
              invite members from the group page.
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
            {currentStep === "review" ? "Edit" : "Back"}
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
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 font-sans text-base font-semibold text-primary shadow-gold disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {soloWarning ? "Continue anyway" : "Create Parayanam"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
