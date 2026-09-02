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
  isValidPaymentInstructions,
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
  const { user, isMonetizationApproved } = useAuth();
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
  const [sameForAllPerDay, setSameForAllPerDay] = useState(1);
  const [scheduleOverrides, setScheduleOverrides] = useState<Record<string, number[]>>({});
  const [editingScheduleDate, setEditingScheduleDate] = useState<string | null>(null);
  const [scheduleEditText, setScheduleEditText] = useState("");
  const [scheduleEditError, setScheduleEditError] = useState<string | null>(null);
  const [schedulePattern, setSchedulePattern] = useState<SchedulePattern>("DAILY");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [autoInvite, setAutoInvite] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(params.get("draft"));
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(!!params.get("draft"));
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

  /** Continue Setup — restore every value the Guru had entered. */
  useEffect(() => {
    const id = params.get("draft");
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      const { data, error: dErr } = await (supabase as any)
        .from("challenge_sessions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("technical_state", "DRAFT")
        .maybeSingle();
      if (cancelled) return;
      if (dErr || !data) {
        setLoadingDraft(false);
        setError(dErr?.message ?? "That draft could not be found.");
        return;
      }
      const d = (data.draft_state ?? {}) as any;
      setParayanamName(data.parayanam_name ?? "");
      setDeliveryMode((data.delivery_mode ?? "SELF_PACED") as DeliveryMode);
      setParticipationType((data.participation_type ?? "FREE") as ParticipationType);
      setDistribution((data.distribution_mode ?? "SAME_FOR_ALL") as DistributionMode);
      setSchedulePattern((data.schedule_pattern ?? "DAILY") as SchedulePattern);
      if (data.start_date) setStartDate(data.start_date);
      if (data.end_date) setEndDate(data.end_date);
      setWeekdays(d.weekdays ?? data.schedule_weekdays ?? []);
      setSameForAllPerDay(d.sameForAllPerDay ?? data.same_for_all_per_day ?? 1);
      setScheduleOverrides(d.scheduleOverrides ?? data.schedule_overrides ?? {});
      if (d.setId) setSetId(d.setId);
      else if (data.dashakam_set_id) setSetId(data.dashakam_set_id);
      setCustom(d.custom ?? (data.dashakam_set_id ? [] : (data.dashakam_list ?? [])));
      if (d.selectedTemplateId) setSelectedTemplateId(d.selectedTemplateId);
      if (d.contribution) setContribution(d.contribution);
      if (d.liveSchedule) setLiveSchedule(d.liveSchedule);
      if (Array.isArray(d.selectedParticipants)) setSelectedParticipants(d.selectedParticipants);
      if (typeof d.includeSelf === "boolean") setIncludeSelf(d.includeSelf);
      if (typeof data.auto_invite_group_members === "boolean") setAutoInvite(data.auto_invite_group_members);
      if (d.step) setStep(d.step);
      setDraftId(id);
      setLoadingDraft(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user?.id]);

  useEffect(() => {
    if (!setId && sets.length && !loadingDraft) setSetId(sets[0].id);
  }, [sets, setId, loadingDraft]);

  useEffect(() => {
    if (!user || loadingDraft) return;
    setSelectedParticipants((prev) =>
      prev.length ? prev : members.map((m) => m.user_id).filter((id) => id !== user.id),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length, user?.id, loadingDraft]);

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
  const planned = useMemo(
    () => buildSchedule(dashakams, dates, mode, [], sameForAllPerDay, scheduleOverrides),
    [dashakams, dates, mode, sameForAllPerDay, scheduleOverrides],
  );
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
            ? invitedCount <= dashakams.length
              ? contiguousBlocks(dashakams, invitedCount).map((block, b) => ({
                  block,
                  memberIndex: (b + i) % invitedCount,
                }))
              : Array.from({ length: invitedCount }, (_, memberIndex) => ({
                  block: [dashakams[(memberIndex + i) % dashakams.length]],
                  memberIndex,
                }))
            : [],
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dates, planned, dashakams, mode, selectedParticipants.length, includeSelf],
  );
  const beginScheduleEdit = (date: string, currentDashakams: number[]) => {
    setEditingScheduleDate(date);
    setScheduleEditText(currentDashakams.join(", "));
    setScheduleEditError(null);
  };

  const cancelScheduleEdit = () => {
    setEditingScheduleDate(null);
    setScheduleEditText("");
    setScheduleEditError(null);
  };

  const saveScheduleOverride = (date: string) => {
    const parsed = scheduleEditText
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value));

    if (!parsed.length) {
      setScheduleEditError("Enter at least one Dashakam number.");
      return;
    }

    const invalid = parsed.find((n) => n < 1 || n > 100 || !dashakams.includes(n));

    if (invalid !== undefined) {
      setScheduleEditError(`Dashakam ${invalid} is not part of the selected Dashakam set.`);
      return;
    }

    setScheduleOverrides((prev) => ({
      ...prev,
      [date]: parsed,
    }));

    setEditingScheduleDate(null);
    setScheduleEditText("");
    setScheduleEditError(null);
  };

  const resetScheduleOverride = (date: string) => {
    setScheduleOverrides((prev) => {
      const next = { ...prev };
      delete next[date];
      return next;
    });

    if (editingScheduleDate === date) {
      setEditingScheduleDate(null);
      setScheduleEditText("");
      setScheduleEditError(null);
    }
  };
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

  /** Monetization gate: a Guru without the monetization_approved role can never use PAID. */
  useEffect(() => {
    if (!isMonetizationApproved && participationType === "PAID") {
      setParticipationType("FREE");
    }
  }, [isMonetizationApproved, participationType]);

  /** Steps are dynamic: Contribution only for PAID, Live Schedule only for LIVE. */
  const stepIds = useMemo(
    () =>
      [
        "details",
        "mode",
        ...(participationType === "PAID" && isMonetizationApproved ? (["contribution"] as const) : []),
        ...(isGroup ? (["distribution"] as const) : []),
        ...(isLive ? (["live"] as const) : []),
        ...(isGroup ? (["participants"] as const) : []),
        "review",
      ] as string[],
    [participationType, isGroup, isLive, isMonetizationApproved],
  );
  const lastStep = stepIds.length;
  const currentStep = stepIds[Math.min(step, lastStep) - 1];

  useEffect(() => {
    if (step > lastStep) setStep(lastStep);
  }, [step, lastStep]);

  const contributionValid =
    isValidContributionAmount(contribution.amount) && isValidPaymentInstructions(contribution.paymentUrl);

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

  /**
   * The columns a parayanam row carries. Identical for a draft and for the
   * final creation — only technical_state and draft_state differ, so the
   * activation path stays exactly what it always was.
   */
  const sessionPayload = (state: "DRAFT" | "ACTIVE") => ({
    user_id: user!.id,
    group_id: groupId ?? null,
    parayanam_name: parayanamName.trim() || null,
    mode: "daily",
    delivery_mode: deliveryMode,
    participation_type: participationType,
    contribution_amount: participationType === "PAID" && contribution.amount ? Number(contribution.amount) : null,
    payment_url: participationType === "PAID" ? contribution.paymentUrl.trim() || null : null,
    payment_note: participationType === "PAID" && contribution.note.trim() ? contribution.note.trim() : null,
    challenge_type: isGroup ? (mode === "RELAY" ? "group_relay" : "group_standard") : "personal",
    auto_invite_group_members: isGroup ? autoInvite : false,
    distribution_mode: mode,
    schedule_pattern: schedulePattern,
    schedule_weekdays: schedulePattern === "WEEKDAYS" ? weekdays : null,
    same_for_all_per_day: mode === "SAME_FOR_ALL" ? sameForAllPerDay : 1,
    schedule_overrides: mode === "SAME_FOR_ALL" ? scheduleOverrides : {},
    start_date: startDate,
    end_date: endDate,

    technical_state: state,
    spiritual_state: "in_progress",
    dashakams_target: dashakams.length,
    dashakam_list: dashakams,

    dashakam_set_id: setId === "custom" ? null : setId,
    // Wizard-only values that have no column of their own; cleared on activation.
    draft_state:
      state === "DRAFT"
        ? {
            step,
            setId,
            custom,
            selectedTemplateId,
            contribution,
            liveSchedule,
            selectedParticipants,
            includeSelf,
            weekdays,
            scheduleOverrides,
            sameForAllPerDay,
          }
        : null,
  });

  /**
   * Saves whatever has been entered so far. Never invites anyone, never builds
   * a schedule and never creates live sessions — a draft activates nothing.
   */
  const handleSaveDraft = async () => {
    if (!user) return;
    setSavingDraft(true);
    setError(null);
    try {
      const payload = sessionPayload("DRAFT");
      if (draftId) {
        const { error: uErr } = await (supabase as any)
          .from("challenge_sessions")
          .update(payload)
          .eq("id", draftId)
          .eq("user_id", user.id)
          .eq("technical_state", "DRAFT");
        if (uErr) throw new Error(uErr.message);
      } else {
        const { data, error: iErr } = await (supabase as any)
          .from("challenge_sessions")
          .insert(payload)
          .select("id")
          .single();
        if (iErr) throw new Error(iErr.message);
        setDraftId(data.id as string);
      }
      setDraftSaved(true);
      toast({
        title: "Parayanam saved as draft",
        description: "You can continue setup later.",
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not save the draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || dashakams.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      // A draft becomes the real parayanam — never a second row.
      const payload = sessionPayload("ACTIVE");
      let session: { id: string };
      if (draftId) {
        const { data, error: uErr } = await (supabase as any)
          .from("challenge_sessions")
          .update(payload)
          .eq("id", draftId)
          .eq("user_id", user.id)
          .eq("technical_state", "DRAFT")
          .select("id")
          .single();
        if (uErr) throw new Error(uErr.message);
        session = data;
      } else {
        const { data, error: sErr } = await (supabase as any)
          .from("challenge_sessions")
          .insert(payload)
          .select("id")
          .single();
        if (sErr) throw new Error(sErr.message);
        session = data;
      }
      track("parayanam_created");

      if (isGroup) {
        await inviteParticipants(session.id, selectedParticipants, includeSelf ? user.id : null);

        // Auto-invite: the backend RPC invites every group member with no
        // participant record. Best-effort — the parayanam itself stays valid
        // even if invitations cannot be completed right now.
        if (autoInvite) {
          try {
            const { error: aiErr } = await (supabase as any).rpc("invite_group_members_to_parayanam", {
              p_session_id: session.id,
            });
            if (aiErr) throw new Error(aiErr.message);
          } catch (e: any) {
            toast({
              title: "Parayanam created, but automatic invitations could not be completed",
              description: e?.message ?? "You can invite members from the group page.",
              variant: "destructive",
            });
          }
        }

        // SAME_FOR_ALL and REPEAT_SAME do not depend on participant confirmations,
        // so their common schedule (assigned_user_id = NULL) is materialised now,
        // by the same backend generator the "Start parayanam" action uses.
        // RELAY remains participant-dependent and is built at finalisation.
        if (mode !== "RELAY") {
          const { error: finErr } = await (supabase as any).rpc("finalize_parayanam", {
            p_session_id: session.id,
          });

          const { count } = await (supabase as any)
            .from("parayanam_schedule")
            .select("id", { count: "exact", head: true })
            .eq("challenge_session_id", session.id);

          // Fallback only if the backend generator produced nothing.
          if (!count) {
            const rows = planned.map((p) => ({
              challenge_session_id: session.id,
              dashakam_no: p.dashakam_no,
              scheduled_date: p.scheduled_date,
              assigned_user_id: null,
              is_manual_override: mode === "SAME_FOR_ALL" && !!scheduleOverrides[p.scheduled_date]?.length,
            }));

            if (rows.length) {
              const { error: schErr } = await (supabase as any).from("parayanam_schedule").insert(rows);
              if (schErr) throw new Error(finErr?.message ?? schErr.message);
            }
          }
        }

      } else {
        const rows = planned.map((p) => ({
          challenge_session_id: session.id,
          dashakam_no: p.dashakam_no,
          scheduled_date: p.scheduled_date,
          assigned_user_id: user.id,
          is_manual_override: !!scheduleOverrides[p.scheduled_date]?.length,
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
      <p className="mt-1 font-sans text-xs text-muted-foreground">
        <span className="text-destructive" aria-hidden="true">
          *
        </span>{" "}
        Required fields
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
                <p className="font-sans text-sm font-semibold text-foreground">
                  Dashakams in this template{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </p>
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
                <p className="font-sans text-sm font-semibold text-foreground">
                  Choose a dashakam set{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
                </p>
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
                  Start date{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
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
                  End date{" "}
                  <span className="text-destructive" aria-hidden="true">
                    *
                  </span>
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
              <p className="font-sans text-sm font-semibold text-foreground">
                Parayanam days{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </p>
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
              <p className="font-sans text-sm font-semibold text-foreground">
                How should dashakams be shared?{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </p>
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
              {mode === "SAME_FOR_ALL" && (
                <div className="mt-4 rounded-xl border border-border p-4">
                  <label className="font-sans text-sm font-semibold text-foreground">Dashakams per Parayanam day</label>

                  <p className="mt-1 font-sans text-xs text-muted-foreground">
                    The selected Dashakams will repeat in order for the full Parayanam.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setSameForAllPerDay(count)}
                        className={`rounded-lg border px-4 py-2 font-sans text-sm ${
                          sameForAllPerDay === count ? "border-primary bg-secondary/30 font-semibold" : "border-border"
                        }`}
                      >
                        {count}
                      </button>
                    ))}

                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={sameForAllPerDay}
                      onChange={(e) => setSameForAllPerDay(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm"
                      aria-label="Custom Dashakams per day"
                    />
                  </div>
                </div>
              )}
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
                      <div className="mt-1">
                        {editingScheduleDate === d.date && mode === "SAME_FOR_ALL" ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={scheduleEditText}
                              onChange={(e) => {
                                setScheduleEditText(e.target.value);
                                setScheduleEditError(null);
                              }}
                              placeholder="e.g. 18, 60, 78"
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 font-sans text-sm"
                            />

                            {scheduleEditError && (
                              <p className="font-sans text-xs text-destructive">{scheduleEditError}</p>
                            )}

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveScheduleOverride(d.date)}
                                className="rounded-lg bg-primary px-3 py-1.5 font-sans text-xs font-semibold text-primary-foreground"
                              >
                                Save
                              </button>

                              <button
                                type="button"
                                onClick={cancelScheduleEdit}
                                className="rounded-lg border border-border px-3 py-1.5 font-sans text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-sans text-xs text-muted-foreground">{d.dashakams.join(", ")}</p>

                              {mode === "SAME_FOR_ALL" && scheduleOverrides[d.date]?.length > 0 && (
                                <p className="mt-0.5 font-sans text-[11px] font-medium text-primary">Customized</p>
                              )}
                            </div>

                            {mode === "SAME_FOR_ALL" && (
                              <div className="flex shrink-0 gap-2">
                                <button
                                  type="button"
                                  onClick={() => beginScheduleEdit(d.date, d.dashakams)}
                                  className="font-sans text-xs font-semibold text-primary hover:underline"
                                >
                                  Edit
                                </button>

                                {scheduleOverrides[d.date]?.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => resetScheduleOverride(d.date)}
                                    className="font-sans text-xs text-muted-foreground hover:underline"
                                  >
                                    Reset
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 hover:border-primary">
              <input
                type="checkbox"
                checked={autoInvite}
                onChange={(e) => setAutoInvite(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="block font-sans text-sm font-semibold text-foreground">
                  Automatically invite group members to this Parayanam
                </span>
                <span className="mt-1 block font-sans text-xs text-muted-foreground">
                  All current group members, and members who join this group later, will receive a Parayanam
                  invitation.
                </span>
              </span>
            </label>
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
                ? { amount: contribution.amount, hasPaymentLink: isValidPaymentInstructions(contribution.paymentUrl) }
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

        {draftSaved && (
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="font-sans text-sm text-foreground">Parayanam saved as draft. You can continue setup later.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDraftSaved(false)}
                className="rounded-lg border border-border px-3 py-2 font-sans text-sm font-semibold text-foreground"
              >
                Continue editing
              </button>
              <Link
                to={isGroup ? `/groups/${groupId}` : "/progress"}
                className="rounded-lg bg-gradient-peacock px-3 py-2 font-sans text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {isGroup ? "Return to Group" : "Return"}
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || busy}
            className="rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground disabled:opacity-40"
          >
            {currentStep === "review" ? "Edit" : "Back"}
          </button>
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={busy || savingDraft}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 font-sans text-sm font-semibold text-foreground disabled:opacity-50"
          >
            {savingDraft && <Loader2 className="h-4 w-4 animate-spin" />}
            Save as Draft
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
