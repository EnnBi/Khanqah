-- name: ListBugReports :many
SELECT * FROM bug_reports
ORDER BY timestamp DESC
LIMIT 100;

-- name: ListBugReportsByStatus :many
SELECT * FROM bug_reports
WHERE status = $1
ORDER BY timestamp DESC
LIMIT 100;

-- name: UpdateBugReportStatus :one
UPDATE bug_reports
SET status = $2,
    fixed_at = CASE WHEN $2::bug_report_status = 'fixed' THEN NOW() ELSE NULL END,
    fixed_by = $3,
    fixed_note = $4
WHERE id = $1
RETURNING *;

-- name: CreateBugReport :one
INSERT INTO bug_reports (client_id, timestamp, type, note, route, app_version, platform, logs, network, error, reported_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
ON CONFLICT (client_id) DO NOTHING
RETURNING *;
