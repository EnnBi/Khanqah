-- name: GetProgress :many
SELECT * FROM listening_progress WHERE user_id = $1;

-- name: UpsertProgress :one
INSERT INTO listening_progress (user_id, content_id, position_seconds, completed)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, content_id) DO UPDATE
  SET position_seconds = $3, completed = $4, updated_at = NOW()
RETURNING *;
