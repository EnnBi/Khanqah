-- name: ListDownloadsByUser :many
SELECT d.*, c.title_en, c.title_ur, c.type, c.media_url, c.thumbnail_url, c.duration
FROM downloads d
JOIN content c ON c.id = d.content_id
WHERE d.user_id = $1
ORDER BY d.downloaded_at DESC;

-- name: AddDownload :one
INSERT INTO downloads (user_id, content_id)
VALUES ($1, $2) RETURNING *;

-- name: RemoveDownload :exec
DELETE FROM downloads WHERE user_id = $1 AND content_id = $2;
