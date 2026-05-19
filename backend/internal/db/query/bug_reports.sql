-- name: ListBugReports :many
SELECT * FROM bug_reports
ORDER BY timestamp DESC
LIMIT 100;

-- name: CreateBugReport :one
INSERT INTO bug_reports (client_id, timestamp, type, note, route, app_version, platform, logs, network, error, reported_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (client_id) DO NOTHING
RETURNING *;
