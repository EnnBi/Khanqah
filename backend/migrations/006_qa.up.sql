-- Add the single-Shaykh role to the existing user_role enum.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'shaykh';

-- Public keys only. Supports rotation and future multi-device.
CREATE TABLE device_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key  BYTEA NOT NULL,
  algo        TEXT NOT NULL DEFAULT 'x25519',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX idx_device_keys_user_active ON device_keys (user_id) WHERE revoked_at IS NULL;

CREATE TABLE qa_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shaykh_id       UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_threads_user ON qa_threads (user_id, last_message_at DESC);
CREATE INDEX idx_qa_threads_shaykh ON qa_threads (shaykh_id, last_message_at DESC);

CREATE TABLE qa_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id          UUID NOT NULL REFERENCES qa_threads(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES users(id),
  recipient_id       UUID NOT NULL REFERENCES users(id),
  direction          TEXT NOT NULL,            -- 'q' | 'a'
  content_type       TEXT NOT NULL,            -- 'text' | 'audio'
  ciphertext_ref     TEXT,                     -- R2 object key (audio)
  ciphertext_inline  BYTEA,                    -- inline ciphertext (text)
  enc_cek            BYTEA NOT NULL,
  nonce_key          BYTEA NOT NULL,
  nonce_payload      BYTEA NOT NULL,
  sender_key_id      UUID NOT NULL REFERENCES device_keys(id),
  byte_size          BIGINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at       TIMESTAMPTZ,
  read_at            TIMESTAMPTZ
);
CREATE INDEX idx_qa_messages_thread ON qa_messages (thread_id, created_at);
CREATE INDEX idx_qa_messages_recipient_unread ON qa_messages (recipient_id) WHERE read_at IS NULL;

CREATE TABLE qa_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  event_type  TEXT NOT NULL,   -- login | device_register | key_gen | msg_sent | msg_delivered | msg_read
  device_id   TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_audit_user ON qa_audit_log (user_id, created_at DESC);
