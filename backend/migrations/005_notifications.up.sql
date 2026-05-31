CREATE TABLE notification_settings (
  key        TEXT PRIMARY KEY,
  enabled    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO notification_settings (key, enabled) VALUES
  ('broadcast_live',  TRUE),
  ('content_upload',  TRUE);
