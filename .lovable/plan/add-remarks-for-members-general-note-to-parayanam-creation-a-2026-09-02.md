# Add "Remarks for members" (general_note) to Parayanam creation and invite card

## Goal
A new optional free-text field, available for both FREE and PAID parayanams, stored in a new `general_note` column on `challenge_sessions` — completely separate from the existing PAID-only `payment_note`.

## Changes

### 1. Database migration (Lovable Cloud)
- `ALTER TABLE public.challenge_sessions ADD COLUMN IF NOT EXISTS general_note text DEFAULT NULL;`
- No RLS/grant changes needed (existing table, existing policies apply).

### 2. `src/pages/CreateParayanamPage.tsx`
- Add state: `const [generalNote, setGeneralNote] = useState("")`.
- Render an optional textarea labeled **"Remarks for members (optional)"** in the "details" step (near the parayanam name), outside the PAID-only "contribution" step — visible for both FREE and PAID.
- `sessionPayload()`: add `general_note: generalNote.trim() ? generalNote.trim() : null` — saved for both DRAFT and ACTIVE states, regardless of `participationType`.
- Draft resume effect: add `setGeneralNote(data.general_note ?? "")` so a resumed draft restores the remark. (No `draft_state` change needed since it lives in its own column.)
- Existing `payment_note` line untouched.

### 3. `src/hooks/useParayanamParticipants.ts`
- `PendingInvite` interface: add `general_note: string | null`.
- Extend the pending-invites `select(...)` column list to include `general_note` and map it in the row assembly (`general_note: s?.general_note ?? null`).

### 4. `src/components/ParayanamInviteCard.tsx`
- `ParayanamInviteCard`: render `{i.general_note && <div className="italic">{i.general_note}</div>}` alongside the existing `payment_note` render — but placed outside the `paid && canViewExternalPaymentLinks` block so it shows for FREE parayanams too. If both notes exist on a PAID invite, both show.
- `AwaitingContributionCard`: add `{i.general_note && <p className="mt-2 font-sans text-xs italic text-muted-foreground">{i.general_note}</p>}` next to the existing `payment_note` line (same styling).

## Explicitly not changed
- `payment_note` behavior, gating, and the PAID-only contribution step remain exactly as-is.
- No changes to payment logic, roles, or other steps.

## Technical notes
- `challenge_sessions.general_note` is new; the migration runs before the UI writes to it.
- Drafts saved before this change simply have `general_note = NULL` — resume falls back to empty string.
