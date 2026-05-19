-- name: CreateOTP :one
INSERT INTO otps (phone, otp_hash, expires_at)
VALUES ($1, $2, $3) RETURNING *;

-- name: GetLatestOTPByPhone :one
SELECT * FROM otps
WHERE phone = $1 AND used = FALSE AND expires_at > NOW()
ORDER BY created_at DESC LIMIT 1;

-- name: IncrementOTPAttempts :one
UPDATE otps SET attempts = attempts + 1 WHERE id = $1 RETURNING *;

-- name: MarkOTPUsed :exec
UPDATE otps SET used = TRUE WHERE id = $1;

-- name: CountRecentOTPsByPhone :one
SELECT COUNT(*) FROM otps
WHERE phone = $1 AND created_at > NOW() - INTERVAL '10 minutes';
