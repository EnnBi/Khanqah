-- 005_yt_mirror.sql — YouTube → archive.org mirror pipeline
-- Adds the mirror_* columns that the server worker writes to, an index that
-- makes the poll query trivial, and swaps the public read policy so that
-- in-progress / failed mirror rows are invisible to the public app.

BEGIN;

-- ── Enum types ───────────────────────────────────────────────
CREATE TYPE mirror_status_t AS ENUM (
  'pending', 'downloading', 'uploading', 'ready', 'failed', 'not_applicable'
);

CREATE TYPE mirror_format_t AS ENUM ('audio', 'video');

-- ── New columns on content ───────────────────────────────────
ALTER TABLE public.content
  ADD COLUMN mirror_status     mirror_status_t NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN mirror_format     mirror_format_t,
  ADD COLUMN mirror_source_url TEXT,
  ADD COLUMN mirror_error      TEXT,
  ADD COLUMN mirror_attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN mirror_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Poll index: only rows that matter for the worker ─────────
CREATE INDEX content_mirror_pending_idx
  ON public.content (created_at)
  WHERE mirror_status = 'pending';

-- ── Replace the broad public read policy ─────────────────────
DROP POLICY IF EXISTS "content: anyone reads" ON public.content;

CREATE POLICY "content: public reads ready only"
  ON public.content FOR SELECT
  USING (
    mirror_status IN ('ready', 'not_applicable')
    OR public.get_user_role() IN ('editor', 'admin')
  );

COMMIT;
