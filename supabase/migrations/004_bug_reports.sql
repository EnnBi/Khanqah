-- Bug reports table for the dev-only bug reporter.
-- Reports are submitted by the app (auto-capture or manual), reviewed by
-- admins, and marked fixed once resolved.

CREATE TYPE public.bug_report_status AS ENUM ('open', 'fixed', 'ignored');

CREATE TABLE public.bug_reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      TEXT NOT NULL,           -- Original ID assigned by the client (keeps client-side dedup possible)
  timestamp      TIMESTAMPTZ NOT NULL,    -- When the report was captured
  type           TEXT NOT NULL,           -- ui | backend | auto-error | auto-warn | auto-network | other
  note           TEXT,
  route          TEXT NOT NULL DEFAULT '',
  app_version    TEXT NOT NULL DEFAULT '0.0.0',
  platform       TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  logs           JSONB NOT NULL DEFAULT '[]'::jsonb,
  network        JSONB NOT NULL DEFAULT '[]'::jsonb,
  error          JSONB,
  reported_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Triage state
  status         public.bug_report_status NOT NULL DEFAULT 'open',
  fixed_at       TIMESTAMPTZ,
  fixed_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  fixed_note     TEXT,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_bug_reports_client_id ON public.bug_reports (client_id);
CREATE INDEX idx_bug_reports_status    ON public.bug_reports (status);
CREATE INDEX idx_bug_reports_timestamp ON public.bug_reports (timestamp DESC);

-- RLS: only admins can read/write bug reports. Anyone can insert (so the
-- reporter works for guests too) but inserts are restricted to their own
-- reported_by = auth.uid() OR NULL (for guests).
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bug_reports: anyone can insert"
  ON public.bug_reports FOR INSERT
  WITH CHECK (reported_by IS NULL OR reported_by = auth.uid());

CREATE POLICY "bug_reports: admins read all"
  ON public.bug_reports FOR SELECT
  USING (public.get_user_role() = 'admin');

CREATE POLICY "bug_reports: admins update"
  ON public.bug_reports FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "bug_reports: admins delete"
  ON public.bug_reports FOR DELETE
  USING (public.get_user_role() = 'admin');
