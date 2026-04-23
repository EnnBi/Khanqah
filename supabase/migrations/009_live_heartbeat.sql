-- 009_live_heartbeat.sql — resilience additions for live broadcasting.
--   (a) last_heartbeat_at lets us detect a dead broadcaster client.
--   (b) partial unique index enforces at most one status='live' row
--       at any time — the second concurrent start fails at the DB.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Backfill existing live rows so the sweep doesn't clobber them.
UPDATE public.live_sessions
SET last_heartbeat_at = started_at
WHERE status = 'live' AND last_heartbeat_at IS NULL;

-- Partial unique index: only one row can have status='live' at a time.
-- The `(1)` expression means uniqueness applies to each row as a whole,
-- not a column value — every live row would clash on `1`.
CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_one_live_at_a_time
ON public.live_sessions ((1))
WHERE status = 'live';
