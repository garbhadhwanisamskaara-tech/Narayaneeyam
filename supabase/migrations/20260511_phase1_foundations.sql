-- Phase 1 — Foundations: phone + streak columns + streak helper
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_date date;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.bump_user_streak(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _last  date;
  _cur   integer;
  _max   integer;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
    INTO _last, _cur, _max
    FROM public.profiles WHERE id = _user_id;

  IF _last IS NULL OR _last < _today - INTERVAL '1 day' THEN
    _cur := 1;
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _cur := COALESCE(_cur, 0) + 1;
  END IF;

  IF _cur > COALESCE(_max, 0) THEN _max := _cur; END IF;

  UPDATE public.profiles
     SET current_streak = _cur,
         longest_streak = _max,
         last_activity_date = _today
   WHERE id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_user_streak(uuid) TO authenticated;
