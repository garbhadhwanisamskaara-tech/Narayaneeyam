# Feature Expansion Plan — Challenges, Groups, Notifications, Certificates

This plan maps each requested feature against the **current architecture** so you can see what to reuse, what to extend, and what is brand new. No code is written yet — approval first.

---

## 1. Reuse vs Build — Feature-by-Feature Table

| # | Feature | Already exists | Build / Extend | Conflicts / Risks |
|---|---------|----------------|----------------|-------------------|
| 1 | **Phone + OTP auth** | Supabase Auth (email/password), `AuthContext`, `Layout` gate, profile auto-creation, trial logic, `/auth` and `/reset-password` pages | Enable Phone provider in Cloud (Twilio); add phone-OTP UI to `AuthPage`; extend `AuthContext` with `signInWithPhone`/`verifyOtp`; store `phone` on `profiles`; keep email path alongside | Existing users are email-based — must support **both** methods, not replace. Email-verification gate (`/verify-email`) doesn't apply to phone — gate must branch on `user.phone` vs `user.email`. Trial policy (2026-12-31) must apply identically. |
| 2 | **Personal Parayanam Challenges (Saptaah / 21-day / 100-day)** | `DEVOTION_PATHWAYS` static list, `100-day-journey` pathway, `useUserProgress`, `user_progress` table (`pathway_id, dashakam_no, completed_date`), `HundredDayJourney` UI, `ProgressRing` | New `challenges` table (challenge templates: saptaah/21d/100d with target dashakam list + duration). New `user_challenges` table (instance per user: started_at, target_end, mode, status). New `useChallenges` hook + `ChallengePage`. Reuse `user_progress` for per-day marks. | `pathway_id` is currently a free-text string mixing modes ("chant"/"learn") and pathway IDs — needs cleanup or a separate `challenge_id` column to avoid collisions. |
| 3 | **Dashakam completion marking** — manual tap | `useMemberProgress.markVerseFinished`, `useUserProgress.markComplete`, `checkDashakamCompletion` auto-rolls verse marks into dashakam complete | Add explicit "Mark dashakam complete" button on Chant + Pathway dashakam list, calling existing `markComplete` | None — already wired |
| 3b | **Audio 90% auto-detect** | `AudioContext` exposes `state.progress` (0-100) and `onEnded` ref; `ChantPage` + `PodcastPage` track playback | Add a `useAutoComplete` hook subscribing to `audio.state.progress`; when ≥ 90% on a verse and not yet marked, call `markVerseFinished` (debounced, once per verse per session) | Must respect existing **Verse → Sloka → Bell** sequence (`useSlokaPlayback`) — only count 90% of the **main verse**, not bell/sloka, to avoid double-marking. |
| 3c | **Scroll auto-detect** | Karaoke highlight + scroll sync (`activeVerseIndex`, 150ms debounce) already exists | Track which verses have scrolled past viewport center; when last verse of a dashakam scrolls past, mark verses 1..N complete | Risk of false positives when user is just browsing — gate behind "Chant mode" only, never on `/script` Library route |
| 4 | **Streak tracking** | `calculateStreak()` in `useUserProgress` already computes consecutive-day streak from `user_progress` rows; `Index` and `Dashboard` already display streak | Persist `current_streak`, `longest_streak`, `last_activity_date` on `profiles` (denormalised) for fast reads + leaderboards. Add nightly streak-reset edge function (or compute lazily). | Existing streak is recomputed every read from full history — works for ≤ 100 dashakams but won't scale to group leaderboards; needs caching column |
| 5 | **Group Parayanam + invite links** | None | New tables: `groups` (id, name, owner_id, mode, target dashakams, start/end), `group_members` (group_id, user_id, role, joined_at), `group_invites` (token, group_id, expires_at, max_uses). New routes: `/groups`, `/groups/:id`, `/join/:token`. New components: `GroupCard`, `GroupDetail`, `InviteSheet`. | Invite-link route must be **public** (like `/auth`) — needs to be lifted out of `Layout` auth gate, then redirect to `/auth?next=/join/:token` if not signed in. |
| 6 | **Relay mode (assignments)** | None | Add `mode = 'relay'` to `groups`. New `group_assignments` (group_id, user_id, dashakam_no, status, assigned_at, completed_at). Auto-assignment algorithm (round-robin / claim-based). UI: "Claim a dashakam" / "My assigned dashakams". | Keep relay logic server-side via an edge function (`claim-dashakam`) to prevent race conditions where two members claim the same number |
| 7 | **10×10 completion grid (group progress)** | `HundredDayJourney` already renders a 100-cell grid for a single user | Generalise into `<DashakamGrid />` accepting `cells: { dashakam: number; state: 'done'|'claimed'|'open'; user?: {name, color} }[]`. Reuse on Group Detail page. | Live updates need Supabase Realtime subscription on `group_assignments` + `user_progress` — not currently used anywhere |
| 8 | **Push notification reminders** | None (Sentry only) | Two paths: **(a)** Web Push (VAPID keys + service worker `/sw.js` + `push_subscriptions` table + edge function `send-push`); **(b)** SMS via Twilio if you want phone-OTP users covered without installing PWA. New `notification_preferences` table (daily reminder time, quiet hours, group events, streak warnings). Edge function on cron (Supabase pg_cron) to dispatch. | Project is **not yet a PWA** — for Web Push you must add a service worker + manifest (capability listed in capacitor knowledge). iOS Safari needs the app installed to home screen. SMS reminders require Twilio connector + opt-in to avoid SMS-pumping liability. |
| 9 | **Completion certificates (PDF + shareable image)** | None | Edge function `generate-certificate` using **pdf-lib** (PDF) + **@vercel/og** or **satori** (PNG). Inputs: user name, challenge type, dates, dashakams completed. Store in new Storage bucket `certificates/`. UI: "Download PDF" + "Share image" (Web Share API) on completion screen + Dashboard. | Fonts: Sanskrit / Devanagari rendering needs an embedded Noto Sans Devanagari TTF in the function — adds ~600 KB to function bundle. Image generation in Deno is heavier; consider pre-rendering as PNG once and caching. |

---

## 2. Database Changes Summary

**New tables**

```text
challenges            (id, slug, name, duration_days, dashakam_set, default_mode, active)
user_challenges       (id, user_id, challenge_id, started_at, target_end, status, mode)
groups                (id, name, owner_id, mode, dashakam_set, start_at, end_at, created_at)
group_members         (group_id, user_id, role, joined_at)        -- composite PK
group_invites         (token PK, group_id, expires_at, max_uses, uses)
group_assignments     (id, group_id, user_id, dashakam_no, status, assigned_at, completed_at)
push_subscriptions    (id, user_id, endpoint, p256dh, auth, platform, created_at)
notification_prefs    (user_id PK, daily_time, timezone, channels jsonb, quiet_hours jsonb)
certificates          (id, user_id, kind, payload jsonb, pdf_path, image_path, issued_at)
```

**Schema changes to existing tables**

- `profiles` — add `phone text unique`, `current_streak int`, `longest_streak int`, `last_activity_date date`
- `user_progress` — add nullable `challenge_id uuid` (decouple from free-text `pathway_id`)
- `user_progress` — add `source text check (source in ('manual','audio','scroll'))` for auditing auto-marks

**RLS**: every new user-scoped table follows the existing `auth.uid() = user_id` pattern. `groups` / `group_members` use a `is_group_member(group_id, auth.uid())` SECURITY DEFINER function (same pattern as `has_role`) to avoid recursive policies.

---

## 3. Edge Functions to Add

| Function | Purpose | Notes |
|---|---|---|
| `claim-dashakam` | Atomic relay claim with row-lock | Prevents double-assignment |
| `create-invite` | Generate invite token + URL | `verify_jwt = true` |
| `accept-invite` | Validate token, add user to group | Public route entry point |
| `send-push` | Send Web Push to subscribers | VAPID keys as secrets |
| `send-sms-reminder` | Optional Twilio reminders | Uses Twilio connector — opt-in only |
| `dispatch-reminders` | pg_cron-driven hourly job | Picks users whose local time matches preference |
| `generate-certificate` | PDF + PNG generation | pdf-lib + satori; Devanagari font |

---

## 4. Frontend — New / Changed

**New pages**: `/challenges`, `/challenges/:id`, `/groups`, `/groups/:id`, `/join/:token`, `/notifications`, `/certificates`.
**New components**: `ChallengeCard`, `ChallengeProgressRing`, `DashakamGrid` (generalised), `GroupCard`, `GroupDetail`, `RelayClaimButton`, `InviteSheet`, `NotificationPrefs`, `CertificateCard`, `ShareSheet`, `PhoneOtpForm`.
**New hooks**: `useChallenges`, `useGroups`, `useGroupRealtime`, `useAutoComplete`, `usePushSubscription`, `useCertificates`.
**Updated**: `AuthPage` (phone tab), `AuthContext` (phone methods, streak/last-activity), `Layout` (gate branches on phone vs email; lifts `/join/:token` out of gate), `ChantPage` (auto-complete, mark-dashakam button), `Index` (Challenges card), `BottomNav` (consider adding Groups), `App.tsx` (new routes), `MoreMenu` (Certificates, Notifications).

---

## 5. Suggested Phasing

```text
Phase 1 — Foundations (1 sprint)
  Phone OTP auth · profiles.phone & streak columns · /join/:token public route

Phase 2 — Personal Challenges (1 sprint)
  challenges + user_challenges schema · ChallengePage · auto-complete (audio 90% + scroll)
  · Mark-dashakam button · streak persistence

Phase 3 — Groups & Relay (1.5 sprints)
  groups, group_members, group_invites, group_assignments
  · Invite flow · 10×10 group grid with Realtime · claim-dashakam edge function

Phase 4 — Notifications (1 sprint)
  PWA service worker + VAPID Web Push · notification_prefs UI
  · dispatch-reminders cron · optional Twilio SMS lane

Phase 5 — Certificates (0.5 sprint)
  generate-certificate edge function (pdf-lib + satori + Devanagari font)
  · certificates table & bucket · ShareSheet (Web Share API)
```

---

## 6. Open Decisions Needed Before Build

1. **Phone OTP**: keep email/password too, or replace? (recommend: keep both)
2. **Push channel**: Web Push (PWA) only, or also SMS via Twilio for non-PWA users?
3. **Relay assignment policy**: auto round-robin on join, or members claim manually?
4. **Certificate scope**: per-challenge only, or also per-group completion + lifetime "All 100"?
5. **Group privacy**: invite-only always, or also discoverable public groups?

Once you confirm direction on these five, I can move to implementation.
