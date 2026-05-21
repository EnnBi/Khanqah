-- name: ListCategories :many
SELECT id, name_en, name_ur, type, parent_id, sort_order, slug FROM categories ORDER BY sort_order ASC, name_en ASC;

-- name: GetCategory :one
SELECT id, name_en, name_ur, type, parent_id, sort_order, slug FROM categories WHERE id = $1;

-- name: CreateCategory :one
INSERT INTO categories (name_en, name_ur) VALUES ($1, $2)
RETURNING id, name_en, name_ur, type, parent_id, sort_order, slug;

-- name: UpdateCategory :one
UPDATE categories SET name_en=$2, name_ur=$3 WHERE id=$1
RETURNING id, name_en, name_ur, type, parent_id, sort_order, slug;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;
