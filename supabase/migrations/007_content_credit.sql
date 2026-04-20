-- 007_content_credit.sql — bilingual credit field on content rows.
-- Used to record the speaker (bayan/clip/nazam/hamd_naat), the reciter
-- (quran), or the author (book). Nullable — existing rows stay NULL
-- until an admin edits them.

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS credit_en TEXT,
  ADD COLUMN IF NOT EXISTS credit_ur TEXT;
