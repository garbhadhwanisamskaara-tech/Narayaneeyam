ALTER TABLE member_progress ADD COLUMN IF NOT EXISTS mode text DEFAULT 'chant' CHECK (mode IN ('chant', 'learn'));

DO $$
BEGIN
  BEGIN
    ALTER TABLE member_progress DROP CONSTRAINT IF EXISTS member_progress_user_id_dashakam_number_verse_number_key;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER TABLE member_progress ADD CONSTRAINT member_progress_user_dashakam_verse_mode_key 
      UNIQUE (user_id, dashakam_number, verse_number, mode);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;
