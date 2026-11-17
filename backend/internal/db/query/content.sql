-- name: ListContent :many
SELECT * FROM content
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: ListContentByType :many
SELECT * FROM content WHERE type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: ListContentByCategory :many
SELECT * FROM content WHERE category_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;

-- name: GetContent :one
SELECT * FROM content WHERE id = $1;

-- name: CreateContent :one
INSERT INTO content (title_en, title_ur, description_en, description_ur, credit_en, credit_ur,
  type, category_id, media_url, thumbnail_url, duration, file_size, is_video, uploaded_by)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
RETURNING *;

-- name: UpdateContent :one
UPDATE content SET
  title_en = $2, title_ur = $3, description_en = $4, description_ur = $5,
  credit_en = $6, credit_ur = $7, type = $8, category_id = $9,
  media_url = $10, thumbnail_url = $11, duration = $12, file_size = $13,
  is_video = $14, updated_at = NOW()
WHERE id = $1 RETURNING *;

-- name: DeleteContent :exec
DELETE FROM content WHERE id = $1;

-- name: SearchContent :many
-- Optional filters (NULL = no filter). q matches title or speaker (either language);
-- speaker is the normalised key from ContentSpeakerFacets ('' = no speaker).
SELECT * FROM content
WHERE (sqlc.narg('type')::content_type IS NULL OR type = sqlc.narg('type')::content_type)
  AND (sqlc.narg('category_id')::uuid IS NULL OR category_id = sqlc.narg('category_id')::uuid)
  AND (sqlc.narg('q')::text IS NULL
       OR strpos(lower(title_en), lower(sqlc.narg('q')::text)) > 0
       OR strpos(lower(title_ur), lower(sqlc.narg('q')::text)) > 0
       OR strpos(lower(COALESCE(credit_en, '')), lower(sqlc.narg('q')::text)) > 0
       OR strpos(lower(COALESCE(credit_ur, '')), lower(sqlc.narg('q')::text)) > 0)
  AND (sqlc.narg('speaker')::text IS NULL
       OR lower(COALESCE(NULLIF(btrim(credit_en), ''), NULLIF(btrim(credit_ur), ''), '')) = lower(sqlc.narg('speaker')::text))
ORDER BY created_at DESC
LIMIT sqlc.arg('lim') OFFSET sqlc.arg('off');

-- name: ContentSpeakerFacets :many
SELECT lower(COALESCE(NULLIF(btrim(credit_en), ''), NULLIF(btrim(credit_ur), ''), ''))::text AS speaker_key,
       COALESCE(MAX(NULLIF(btrim(credit_en), '')), '')::text AS name_en,
       COALESCE(MAX(NULLIF(btrim(credit_ur), '')), '')::text AS name_ur,
       COUNT(*)::bigint AS total
FROM content
WHERE (sqlc.narg('type')::content_type IS NULL OR type = sqlc.narg('type')::content_type)
  AND (sqlc.narg('category_id')::uuid IS NULL OR category_id = sqlc.narg('category_id')::uuid)
GROUP BY 1
ORDER BY 1;

-- name: ContentCategoryFacets :many
SELECT category_id, COUNT(*)::bigint AS total
FROM content
WHERE (sqlc.narg('type')::content_type IS NULL OR type = sqlc.narg('type')::content_type)
  AND (sqlc.narg('category_id')::uuid IS NULL OR category_id = sqlc.narg('category_id')::uuid)
GROUP BY category_id;
