CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE content_type AS ENUM (
  'bayan', 'clip', 'nazam', 'quran', 'hamd_naat', 'book', 'mamulat'
);
CREATE TYPE user_role AS ENUM ('listener', 'editor', 'admin', 'broadcaster');
CREATE TYPE live_session_status AS ENUM ('live', 'ended', 'processing');
CREATE TYPE bug_report_status AS ENUM ('open', 'fixed', 'ignored');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL DEFAULT '',
  role          user_role NOT NULL DEFAULT 'listener',
  language_pref TEXT NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'ur')),
  theme_pref    TEXT NOT NULL DEFAULT 'system' CHECK (theme_pref IN ('light', 'dark', 'system')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en     TEXT NOT NULL,
  name_ur     TEXT NOT NULL,
  type        content_type NOT NULL,
  parent_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en        TEXT NOT NULL,
  title_ur        TEXT NOT NULL,
  description_en  TEXT,
  description_ur  TEXT,
  credit_en       TEXT,
  credit_ur       TEXT,
  type            content_type NOT NULL,
  category_id     UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  media_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  duration        INTEGER,
  file_size       BIGINT,
  is_video        BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE topics (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id        UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  title_en          TEXT NOT NULL,
  title_ur          TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  sort_order        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE playlists (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE playlist_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id  UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  content_id   UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  added_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (playlist_id, content_id)
);

CREATE TABLE downloads (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id     UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  downloaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

CREATE TABLE listening_progress (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id       UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  completed        BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

CREATE TABLE live_sessions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en       TEXT NOT NULL,
  title_ur       TEXT NOT NULL,
  stream_url     TEXT NOT NULL,
  started_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  recording_url  TEXT,
  status         live_session_status NOT NULL DEFAULT 'live'
);

CREATE TABLE scheduled_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en         TEXT NOT NULL,
  title_ur         TEXT NOT NULL,
  description_en   TEXT,
  description_ur   TEXT,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule  TEXT,
  created_by       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bug_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id    TEXT NOT NULL UNIQUE,
  timestamp    TIMESTAMPTZ NOT NULL,
  type         TEXT NOT NULL,
  note         TEXT,
  route        TEXT NOT NULL DEFAULT '',
  app_version  TEXT NOT NULL DEFAULT '0.0.0',
  platform     TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  logs         JSONB NOT NULL DEFAULT '[]',
  network      JSONB NOT NULL DEFAULT '[]',
  error        JSONB,
  reported_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  status       bug_report_status NOT NULL DEFAULT 'open',
  fixed_at     TIMESTAMPTZ,
  fixed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  fixed_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_content_type        ON content (type);
CREATE INDEX idx_content_category_id ON content (category_id);
CREATE INDEX idx_content_created_at  ON content (created_at DESC);
CREATE INDEX idx_topics_content_id   ON topics (content_id);
CREATE INDEX idx_live_sessions_status ON live_sessions (status);
CREATE INDEX idx_scheduled_sessions_at ON scheduled_sessions (scheduled_at);
CREATE INDEX idx_bug_reports_status  ON bug_reports (status);
