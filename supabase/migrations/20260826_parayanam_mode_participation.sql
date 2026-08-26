-- Mode & Participation screen: delivery mode + participation type on parayanams
ALTER TABLE public.challenge_sessions
  ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'SELF_PACED',
  ADD COLUMN IF NOT EXISTS participation_type text NOT NULL DEFAULT 'FREE';

ALTER TABLE public.challenge_sessions
  DROP CONSTRAINT IF EXISTS challenge_sessions_delivery_mode_check;
ALTER TABLE public.challenge_sessions
  ADD CONSTRAINT challenge_sessions_delivery_mode_check
  CHECK (delivery_mode IN ('SELF_PACED', 'LIVE'));

ALTER TABLE public.challenge_sessions
  DROP CONSTRAINT IF EXISTS challenge_sessions_participation_type_check;
ALTER TABLE public.challenge_sessions
  ADD CONSTRAINT challenge_sessions_participation_type_check
  CHECK (participation_type IN ('FREE', 'PAID'));
