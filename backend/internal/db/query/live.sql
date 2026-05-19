-- name: GetCurrentLiveSession :one
SELECT * FROM live_sessions WHERE status = 'live' ORDER BY started_at DESC LIMIT 1;

-- name: CreateLiveSession :one
INSERT INTO live_sessions (title_en, title_ur, stream_url, started_by)
VALUES ($1, $2, $3, $4) RETURNING *;

-- name: EndLiveSession :one
UPDATE live_sessions SET status = 'ended', ended_at = NOW()
WHERE id = $1 RETURNING *;
