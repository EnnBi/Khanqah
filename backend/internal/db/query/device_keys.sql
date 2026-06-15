-- name: RevokeActiveDeviceKeys :exec
UPDATE device_keys SET revoked_at = NOW()
WHERE user_id = $1 AND revoked_at IS NULL;

-- name: CreateDeviceKey :one
INSERT INTO device_keys (user_id, public_key, algo)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetActiveDeviceKeyByUser :one
SELECT * FROM device_keys
WHERE user_id = $1 AND revoked_at IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- name: GetDeviceKeyByID :one
SELECT * FROM device_keys WHERE id = $1;
