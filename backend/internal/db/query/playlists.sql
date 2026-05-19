-- name: ListPlaylists :many
SELECT * FROM playlists WHERE user_id = $1 ORDER BY created_at DESC;

-- name: GetPlaylist :one
SELECT * FROM playlists WHERE id = $1 AND user_id = $2;

-- name: CreatePlaylist :one
INSERT INTO playlists (user_id, name, is_public)
VALUES ($1, $2, $3) RETURNING *;

-- name: AddPlaylistItem :one
INSERT INTO playlist_items (playlist_id, content_id, sort_order)
VALUES ($1, $2, $3) RETURNING *;

-- name: RemovePlaylistItem :exec
DELETE FROM playlist_items WHERE playlist_id = $1 AND content_id = $2;

-- name: ListPlaylistItems :many
SELECT pi.*, c.title_en, c.title_ur, c.type, c.media_url, c.thumbnail_url, c.duration
FROM playlist_items pi
JOIN content c ON c.id = pi.content_id
WHERE pi.playlist_id = $1
ORDER BY pi.sort_order ASC;
