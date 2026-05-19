-- name: ListCategories :many
SELECT * FROM categories ORDER BY sort_order ASC;

-- name: GetCategory :one
SELECT * FROM categories WHERE id = $1;

-- name: CreateCategory :one
INSERT INTO categories (name_en, name_ur, type, parent_id, sort_order)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- name: UpdateCategory :one
UPDATE categories SET name_en=$2, name_ur=$3, type=$4, parent_id=$5, sort_order=$6
WHERE id=$1 RETURNING *;

-- name: DeleteCategory :exec
DELETE FROM categories WHERE id = $1;
