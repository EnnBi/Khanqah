-- name: GetProgress :one
SELECT * FROM listening_progress
WHERE user_id = $1 AND content_id = $2;

-- name: UpsertProgress :one
INSERT INTO listening_progress (user_id, content_id, position_seconds, completed, updated_at)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (user_id, content_id) DO UPDATE
SET position_seconds = EXCLUDED.position_seconds,
    completed = EXCLUDED.completed,
    updated_at = NOW()
RETURNING *;

-- name: ListProgressByUser :many
SELECT * FROM listening_progress WHERE user_id = $1
ORDER BY updated_at DESC;
