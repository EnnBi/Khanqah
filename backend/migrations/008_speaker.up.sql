-- Who is speaking in a live or scheduled session. Existing rows get the default
-- speaker. Keep the defaults in sync with internal/handler/speaker.go.
ALTER TABLE live_sessions
  ADD COLUMN speaker_en TEXT NOT NULL DEFAULT 'Mufti Abdur Rashid Miftahi Sb',
  ADD COLUMN speaker_ur TEXT NOT NULL DEFAULT 'مفتی عبدالرشید مفتاحی صاحب';

ALTER TABLE scheduled_sessions
  ADD COLUMN speaker_en TEXT NOT NULL DEFAULT 'Mufti Abdur Rashid Miftahi Sb',
  ADD COLUMN speaker_ur TEXT NOT NULL DEFAULT 'مفتی عبدالرشید مفتاحی صاحب';
