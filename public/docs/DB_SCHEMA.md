# Sriman Narayaneeyam — Database Schema Document

## Overview

This document defines the complete database schema for the Sriman Narayaneeyam web application. The schema supports multi-language verse storage, user progress tracking, lesson planning, and podcast playback state.

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐
│  dashakams    │──1:N──│     verses       │
└──────────────┘       └──────────────────┘
                              │
                              │ (referenced by)
                              ▼
┌──────────────┐       ┌──────────────────┐
│    users      │──1:N──│  user_progress   │
└──────────────┘       └──────────────────┘
       │
       ├──1:N──┌──────────────────┐
       │       │  lesson_plans    │
       │       └──────────────────┘
       │
       ├──1:N──┌──────────────────┐
       │       │ podcast_state    │
       │       └──────────────────┘
       │
       └──1:N──┌──────────────────┐
               │ chant_sessions   │
               └──────────────────┘

┌──────────────────────┐
│  additional_slokas   │  (standalone, linked by dashakam_id + position)
└──────────────────────┘

┌──────────────────────┐
│  audio_files         │  (linked to dashakam or verse)
└──────────────────────┘
```

---

## Tables

### 1. `dashakams`

Stores metadata for each of the 100 dashakams.

| Column                | Type         | Constraints         | Description                                      |
|-----------------------|--------------|---------------------|--------------------------------------------------|
| `id`                  | INTEGER      | PRIMARY KEY         | Dashakam number (1–100)                          |
| `title_sanskrit`      | TEXT         | NOT NULL            | Title in Devanagari script                       |
| `title_english`       | TEXT         | NOT NULL            | English translation of the title                 |
| `title_transliteration` | TEXT       | NOT NULL            | IAST transliteration of the title                |
| `meter`               | INTEGER      | NOT NULL            | Meter number (references poetic meter)           |
| `num_verses`          | INTEGER      | NOT NULL            | Number of verses (10–13)                         |
| `gist`                | TEXT         |                     | Summary of the dashakam                          |
| `benefits`            | TEXT         |                     | Traditional benefit of reciting                  |
| `remarks`             | TEXT         |                     | Special instructions (e.g., "Don't say Sri Hare Namaha") |
| `bell_verses`         | INTEGER[]    |                     | Array of verse numbers where bell should ring    |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()       |                                                  |
| `updated_at`          | TIMESTAMPTZ  | DEFAULT now()       |                                                  |

### 2. `verses`

Stores verse text in multiple languages with meanings.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | TEXT         | PRIMARY KEY                          | Format: `{dashakam}-{verse_number}` e.g. "1-1" |
| `dashakam_id`         | INTEGER      | NOT NULL, FK → dashakams(id)         | Parent dashakam                                |
| `verse_number`        | INTEGER      | NOT NULL                             | Verse/paragraph number within dashakam         |
| `sanskrit`            | TEXT         |                                      | Devanagari script text                         |
| `english`             | TEXT         |                                      | English transliteration (ITRANS/Harvard-Kyoto) |
| `tamil`               | TEXT         |                                      | Tamil script transliteration                   |
| `telugu`              | TEXT         |                                      | Telugu script transliteration                  |
| `malayalam`           | TEXT         |                                      | Malayalam script transliteration                |
| `hindi`               | TEXT         |                                      | Hindi script transliteration                   |
| `marathi`             | TEXT         |                                      | Marathi script transliteration                 |
| `meaning_english`     | TEXT         |                                      | English translation/meaning                    |
| `meaning_tamil`       | TEXT         |                                      | Tamil translation                              |
| `meaning_malayalam`   | TEXT         |                                      | Malayalam translation                          |
| `meaning_telugu`      | TEXT         |                                      | Telugu translation                             |
| `meaning_hindi`       | TEXT         |                                      | Hindi translation                              |
| `meaning_marathi`     | TEXT         |                                      | Marathi translation                            |
| `meter`               | TEXT         |                                      | Poetic meter name (e.g., "Sragdharā")          |
| `prasadam`            | TEXT         |                                      | Prasadam item for this verse (if applicable)   |
| `bell`                | BOOLEAN      | DEFAULT false                        | Whether bell should ring at this verse          |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |
| `updated_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

**Unique constraint:** `(dashakam_id, verse_number)`

### 3. `additional_slokas`

Slokas that are recited at specific points within certain dashakams.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `dashakam_id`         | INTEGER      | NOT NULL, FK → dashakams(id)         | Which dashakam this belongs to                 |
| `after_verse`         | INTEGER      | NOT NULL                             | Insert after this verse number                 |
| `position`            | TEXT         |                                      | "before" or "after" the verse                  |
| `sanskrit`            | TEXT         |                                      | Devanagari text                                |
| `english`             | TEXT         |                                      | English transliteration                        |
| `tamil`               | TEXT         |                                      | Tamil transliteration                          |
| `malayalam`           | TEXT         |                                      | Malayalam transliteration                       |
| `meaning_english`     | TEXT         |                                      | English meaning                                |
| `instructions`        | TEXT         |                                      | How to recite (e.g., "repeat 3 times")         |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

### 4. `prasadam_info`

Specific prasadam offerings per verse.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `dashakam_id`         | INTEGER      | NOT NULL, FK → dashakams(id)         |                                                |
| `verse_number`        | INTEGER      | NOT NULL                             |                                                |
| `item`                | TEXT         | NOT NULL                             | Prasadam name (e.g., "Paal payasam", "Butter") |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

**Unique constraint:** `(dashakam_id, verse_number)`

### 5. `audio_files`

Stores references to uploaded MP3 audio files.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `dashakam_id`         | INTEGER      | NOT NULL, FK → dashakams(id)         |                                                |
| `type`                | TEXT         | NOT NULL                             | "chant", "learn", "podcast", "translation"     |
| `language`            | TEXT         | DEFAULT 'sanskrit'                   | Language of the audio                          |
| `file_url`            | TEXT         | NOT NULL                             | Storage path or URL to the MP3 file            |
| `duration_seconds`    | INTEGER      |                                      | Duration of the audio in seconds               |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

### 6. `users`

User accounts for tracking progress.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() | Maps to auth.users                           |
| `display_name`        | TEXT         |                                      |                                                |
| `email`               | TEXT         | UNIQUE                               |                                                |
| `avatar_url`          | TEXT         |                                      |                                                |
| `preferred_translit`  | TEXT         | DEFAULT 'sanskrit'                   | Default transliteration language               |
| `preferred_translation` | TEXT       | DEFAULT 'english'                    | Default translation language                   |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

### 7. `user_progress`

Tracks per-verse completion for each user.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `user_id`             | UUID         | NOT NULL, FK → users(id)             |                                                |
| `verse_id`            | TEXT         | NOT NULL, FK → verses(id)            |                                                |
| `mode`                | TEXT         | NOT NULL                             | "chant", "learn", "script"                     |
| `completed`           | BOOLEAN      | DEFAULT false                        |                                                |
| `times_practiced`     | INTEGER      | DEFAULT 0                            |                                                |
| `last_practiced_at`   | TIMESTAMPTZ  |                                      |                                                |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

**Unique constraint:** `(user_id, verse_id, mode)`

### 8. `lesson_plans`

User-generated lesson plans.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `user_id`             | UUID         | NOT NULL, FK → users(id)             |                                                |
| `name`                | TEXT         | NOT NULL                             | Plan name                                      |
| `frequency`           | TEXT         | NOT NULL                             | "daily", "weekly", "custom"                    |
| `minutes_per_session` | INTEGER      | NOT NULL                             |                                                |
| `start_dashakam`      | INTEGER      | DEFAULT 1                            |                                                |
| `end_dashakam`        | INTEGER      | DEFAULT 100                          |                                                |
| `schedule_json`       | JSONB        |                                      | Generated schedule with dates and dashakams    |
| `created_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |
| `updated_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

### 9. `chant_sessions`

Logs each chanting/learning session.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `user_id`             | UUID         | NOT NULL, FK → users(id)             |                                                |
| `dashakam_id`         | INTEGER      | NOT NULL, FK → dashakams(id)         |                                                |
| `mode`                | TEXT         | NOT NULL                             | "chant", "learn"                               |
| `duration_seconds`    | INTEGER      |                                      |                                                |
| `verses_completed`    | INTEGER[]    |                                      | Array of verse numbers completed               |
| `started_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |
| `ended_at`            | TIMESTAMPTZ  |                                      |                                                |

### 10. `podcast_state`

Persists podcast playback position per user.

| Column                | Type         | Constraints                          | Description                                    |
|-----------------------|--------------|--------------------------------------|------------------------------------------------|
| `id`                  | UUID         | PRIMARY KEY, DEFAULT gen_random_uuid() |                                              |
| `user_id`             | UUID         | NOT NULL, FK → users(id), UNIQUE     |                                                |
| `current_dashakam`    | INTEGER      | NOT NULL, FK → dashakams(id)         |                                                |
| `position_seconds`    | FLOAT        | DEFAULT 0                            | Playback position within current track         |
| `loop_mode`           | TEXT         | DEFAULT 'none'                       | "none", "single", "all"                        |
| `playlist_json`       | JSONB        |                                      | Custom playlist order                          |
| `updated_at`          | TIMESTAMPTZ  | DEFAULT now()                        |                                                |

---

## Indexes

```sql
CREATE INDEX idx_verses_dashakam ON verses(dashakam_id);
CREATE INDEX idx_user_progress_user ON user_progress(user_id);
CREATE INDEX idx_user_progress_verse ON user_progress(verse_id);
CREATE INDEX idx_chant_sessions_user ON chant_sessions(user_id);
CREATE INDEX idx_audio_files_dashakam ON audio_files(dashakam_id);
CREATE INDEX idx_additional_slokas_dashakam ON additional_slokas(dashakam_id);
```

## Row Level Security (RLS) Policies

```sql
-- Users can only read/write their own progress
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON user_progress
  USING (auth.uid() = user_id);

-- Users can only manage their own lesson plans
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own plans" ON lesson_plans
  USING (auth.uid() = user_id);

-- Dashakams and verses are publicly readable
ALTER TABLE dashakams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dashakams" ON dashakams FOR SELECT USING (true);

ALTER TABLE verses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read verses" ON verses FOR SELECT USING (true);
```

---

## Meter Reference

| Meter Number | Meter Name    | Syllables/Line | Time per Dashakam |
|-------------|---------------|----------------|-------------------|
| 1           | Sragdharā     | 21             | 50 minutes        |
| 3           | Śārdūlavikrīḍita | 19          | 40 minutes        |
| 4           | Vasantatilakā | 14             | 40 minutes        |
| 6           | Upajāti       | 11             | 40 minutes        |
| 9           | Anuṣṭubh      | 8              | 40 minutes        |

> **Note:** Meter 1 (Sragdharā) takes ~5 min/verse (50 min/dashakam). All other meters take ~4 min/verse (40 min/dashakam).

---

## Data Population Summary

- **100 dashakams** with full metadata (title, gist, benefits, bell verses, prasadam info, remarks)
- **Verses for Dashakams 1–5** populated with English transliteration and English meaning
- Sanskrit (Devanagari), Tamil, Telugu, Malayalam transliterations for Dashakam 1
- Remaining dashakam verses: awaiting admin upload of language-specific text files

---

## Admin Data Input Format

### For verse data (JSON):
```json
{
  "dashakam": 1,
  "verse": 1,
  "sanskrit": "सान्द्रानन्दावबोधात्मक...",
  "english": "saandraanandaavabOdhaatmaka...",
  "tamil": "சாந்த்ராநந்தாவபோதாத்மக...",
  "malayalam": "സാന്ദ്രാനന്ദാവബോധാത്മക...",
  "meaning_english": "That Brahman...",
  "meaning_tamil": "அந்த பிரம்மம்...",
  "meter": "Sragdharā",
  "prasadam": "Any fruit or water",
  "bell": true
}
```

### For audio files:
- Format: MP3
- Naming: `dashakam_{number}_{type}.mp3` (e.g., `dashakam_1_chant.mp3`)
- Types: `chant`, `learn`, `podcast`
