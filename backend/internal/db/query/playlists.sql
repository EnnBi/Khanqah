-- name: GetPlaylists :many
SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetDownloads :many
SELECT d.*, c.title_en, c.title_ur, c.media_url, c.type
FROM downloads d JOIN content c ON c.id = d.content_id
WHERE d.user_id = $1 ORDER BY d.downloaded_at DESC;
