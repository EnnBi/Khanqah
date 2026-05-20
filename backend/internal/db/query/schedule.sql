-- name: ListUpcomingSchedule :many
SELECT * FROM scheduled_sessions
WHERE scheduled_at >= NOW()
ORDER BY scheduled_at ASC;

-- name: GetScheduledSession :one
SELECT * FROM scheduled_sessions WHERE id = $1;

-- name: CreateScheduledSession :one
INSERT INTO scheduled_sessions (title_en, title_ur, description_en, description_ur, scheduled_at, is_recurring, recurrence_rule, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;

-- name: UpdateScheduledSession :one
UPDATE scheduled_sessions
SET title_en = $2, title_ur = $3, description_en = $4, description_ur = $5,
    scheduled_at = $6, is_recurring = $7, recurrence_rule = $8
WHERE id = $1 RETURNING *;

-- name: DeleteScheduledSession :exec
DELETE FROM scheduled_sessions WHERE id = $1;
