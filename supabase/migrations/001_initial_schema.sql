-- ============================================================
-- 001_initial_schema.sql
-- Khanqah Maseeh-ul-Ummah — initial database schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────
CREATE TYPE public.content_type AS ENUM (
  'bayan',
  'clip',
  'nazam',
  'quran',
  'hamd_naat',
  'book'
);

CREATE TYPE public.user_role AS ENUM (
  'listener',
  'editor',
  'admin'
);

CREATE TYPE public.live_session_status AS ENUM (
  'live',
  'ended',
  'processing'
);

-- ─────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────

-- users ──────────────────────────────────────────────────────
CREATE TABLE public.users (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL UNIQUE,
  display_name     TEXT NOT NULL DEFAULT '',
  role             public.user_role NOT NULL DEFAULT 'listener',
  language_pref    TEXT NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'ur')),
  theme_pref       TEXT NOT NULL DEFAULT 'system' CHECK (theme_pref IN ('light', 'dark', 'system')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- categories ─────────────────────────────────────────────────
CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     TEXT NOT NULL,
  name_ur     TEXT NOT NULL,
  type        public.content_type NOT NULL,
  parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- content ────────────────────────────────────────────────────
CREATE TABLE public.content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en        TEXT NOT NULL,
  title_ur        TEXT NOT NULL,
  description_en  TEXT,
  description_ur  TEXT,
  type            public.content_type NOT NULL,
  category_id     UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  media_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration        INTEGER,           -- seconds
  file_size       BIGINT,            -- bytes
  is_video        BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- topics ─────────────────────────────────────────────────────
CREATE TABLE public.topics (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id         UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  title_en           TEXT NOT NULL,
  title_ur           TEXT NOT NULL,
  timestamp_seconds  INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  sort_order         INTEGER NOT NULL DEFAULT 0
);

-- playlists ──────────────────────────────────────────────────
CREATE TABLE public.playlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- playlist_items ─────────────────────────────────────────────
CREATE TABLE public.playlist_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id  UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (playlist_id, content_id)
);

-- downloads ──────────────────────────────────────────────────
CREATE TABLE public.downloads (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id     UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  downloaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- listening_progress ─────────────────────────────────────────
CREATE TABLE public.listening_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id       UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- live_sessions ──────────────────────────────────────────────
CREATE TABLE public.live_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en       TEXT NOT NULL,
  title_ur       TEXT NOT NULL,
  stream_url     TEXT NOT NULL,
  started_by     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  recording_url  TEXT,
  status         public.live_session_status NOT NULL DEFAULT 'live'
);

-- scheduled_sessions ─────────────────────────────────────────
CREATE TABLE public.scheduled_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en         TEXT NOT NULL,
  title_ur         TEXT NOT NULL,
  description_en   TEXT,
  description_ur   TEXT,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule  TEXT,             -- RRULE format e.g. FREQ=WEEKLY;BYDAY=TH
  created_by       UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- push_subscriptions ─────────────────────────────────────────
CREATE TABLE public.push_subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  device_type         TEXT NOT NULL CHECK (device_type IN ('android', 'ios', 'web')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, onesignal_player_id)
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────
CREATE INDEX idx_content_type         ON public.content (type);
CREATE INDEX idx_content_category_id  ON public.content (category_id);
CREATE INDEX idx_content_created_at   ON public.content (created_at DESC);
CREATE INDEX idx_topics_content_id    ON public.topics (content_id);
CREATE INDEX idx_playlists_user_id    ON public.playlists (user_id);
CREATE INDEX idx_playlist_items_playlist_id  ON public.playlist_items (playlist_id);
CREATE INDEX idx_downloads_user_id    ON public.downloads (user_id);
CREATE INDEX idx_listening_progress_user_id  ON public.listening_progress (user_id);
CREATE INDEX idx_live_sessions_status ON public.live_sessions (status);
CREATE INDEX idx_scheduled_sessions_scheduled_at ON public.scheduled_sessions (scheduled_at);

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTION: is_admin / is_editor_or_admin
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- users ──────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: read own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid() OR public.get_user_role() = 'admin');

CREATE POLICY "users: update own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY "users: admins update any"
  ON public.users FOR UPDATE
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

-- categories ─────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories: anyone reads"
  ON public.categories FOR SELECT
  USING (TRUE);

CREATE POLICY "categories: editors and admins insert"
  ON public.categories FOR INSERT
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "categories: editors and admins update"
  ON public.categories FOR UPDATE
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "categories: editors and admins delete"
  ON public.categories FOR DELETE
  USING (public.get_user_role() IN ('editor', 'admin'));

-- content ────────────────────────────────────────────────────
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "content: anyone reads"
  ON public.content FOR SELECT
  USING (TRUE);

CREATE POLICY "content: editors insert"
  ON public.content FOR INSERT
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "content: editors update"
  ON public.content FOR UPDATE
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "content: admins delete"
  ON public.content FOR DELETE
  USING (public.get_user_role() = 'admin');

-- topics ─────────────────────────────────────────────────────
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "topics: anyone reads"
  ON public.topics FOR SELECT
  USING (TRUE);

CREATE POLICY "topics: editors and admins insert"
  ON public.topics FOR INSERT
  WITH CHECK (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "topics: editors and admins update"
  ON public.topics FOR UPDATE
  USING (public.get_user_role() IN ('editor', 'admin'));

CREATE POLICY "topics: editors and admins delete"
  ON public.topics FOR DELETE
  USING (public.get_user_role() IN ('editor', 'admin'));

-- playlists ──────────────────────────────────────────────────
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playlists: own data select"
  ON public.playlists FOR SELECT
  USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "playlists: own data insert"
  ON public.playlists FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "playlists: own data update"
  ON public.playlists FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "playlists: own data delete"
  ON public.playlists FOR DELETE
  USING (user_id = auth.uid());

-- playlist_items ─────────────────────────────────────────────
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "playlist_items: own playlists select"
  ON public.playlist_items FOR SELECT
  USING (
    playlist_id IN (
      SELECT id FROM public.playlists
      WHERE user_id = auth.uid() OR is_public = TRUE
    )
  );

CREATE POLICY "playlist_items: own playlists insert"
  ON public.playlist_items FOR INSERT
  WITH CHECK (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_items: own playlists update"
  ON public.playlist_items FOR UPDATE
  USING (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "playlist_items: own playlists delete"
  ON public.playlist_items FOR DELETE
  USING (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

-- downloads ──────────────────────────────────────────────────
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "downloads: own data select"
  ON public.downloads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "downloads: own data insert"
  ON public.downloads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "downloads: own data delete"
  ON public.downloads FOR DELETE
  USING (user_id = auth.uid());

-- listening_progress ─────────────────────────────────────────
ALTER TABLE public.listening_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listening_progress: own data select"
  ON public.listening_progress FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "listening_progress: own data insert"
  ON public.listening_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "listening_progress: own data update"
  ON public.listening_progress FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "listening_progress: own data delete"
  ON public.listening_progress FOR DELETE
  USING (user_id = auth.uid());

-- live_sessions ──────────────────────────────────────────────
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_sessions: anyone reads"
  ON public.live_sessions FOR SELECT
  USING (TRUE);

CREATE POLICY "live_sessions: admins insert"
  ON public.live_sessions FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "live_sessions: admins update"
  ON public.live_sessions FOR UPDATE
  USING (public.get_user_role() = 'admin');

CREATE POLICY "live_sessions: admins delete"
  ON public.live_sessions FOR DELETE
  USING (public.get_user_role() = 'admin');

-- scheduled_sessions ─────────────────────────────────────────
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_sessions: anyone reads"
  ON public.scheduled_sessions FOR SELECT
  USING (TRUE);

CREATE POLICY "scheduled_sessions: admins insert"
  ON public.scheduled_sessions FOR INSERT
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "scheduled_sessions: admins update"
  ON public.scheduled_sessions FOR UPDATE
  USING (public.get_user_role() = 'admin');

CREATE POLICY "scheduled_sessions: admins delete"
  ON public.scheduled_sessions FOR DELETE
  USING (public.get_user_role() = 'admin');

-- push_subscriptions ─────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions: own data select"
  ON public.push_subscriptions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions: own data insert"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions: own data update"
  ON public.push_subscriptions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions: own data delete"
  ON public.push_subscriptions FOR DELETE
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Auto-create user profile on auth signup ────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    'listener'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER listening_progress_updated_at
  BEFORE UPDATE ON public.listening_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
