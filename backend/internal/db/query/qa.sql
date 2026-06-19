-- name: CreateQAThread :one
INSERT INTO qa_threads (user_id, shaykh_id)
VALUES ($1, $2)
RETURNING *;

-- name: GetOpenThreadForUser :one
SELECT * FROM qa_threads
WHERE user_id = $1 AND shaykh_id = $2 AND status = 'open'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetThreadByID :one
SELECT * FROM qa_threads WHERE id = $1;

-- name: ListThreadsForUser :many
SELECT * FROM qa_threads
WHERE user_id = $1
ORDER BY last_message_at DESC;

-- name: ListThreadsForUserWithMeta :many
SELECT t.*,
  (SELECT count(*) FROM qa_messages a
     WHERE a.thread_id = t.id AND a.direction = 'a'
       AND a.recipient_id = $1 AND a.read_at IS NULL)::bigint AS unread_answers,
  COALESCE((
     SELECT EXISTS(
       SELECT 1 FROM qa_messages ans
       WHERE ans.direction = 'a' AND ans.reply_to = lastq.id
     )
     FROM (
       SELECT q.id FROM qa_messages q
       WHERE q.thread_id = t.id AND q.direction = 'q'
       ORDER BY q.created_at DESC LIMIT 1
     ) lastq
  ), false)::boolean AS newest_question_answered
FROM qa_threads t
WHERE t.user_id = $1
ORDER BY t.last_message_at DESC;

-- name: ListThreadsForShaykh :many
SELECT * FROM qa_threads
WHERE shaykh_id = $1
ORDER BY last_message_at DESC;

-- name: TouchThread :exec
UPDATE qa_threads SET last_message_at = NOW(), status = $2 WHERE id = $1;

-- name: CreateQAMessage :one
INSERT INTO qa_messages (
  thread_id, sender_id, recipient_id, direction, content_type,
  ciphertext_ref, ciphertext_inline, enc_cek, nonce_key, nonce_payload,
  sender_key_id, byte_size, reply_to
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
RETURNING *;

-- name: CountUnansweredQuestions :one
SELECT count(*) FROM qa_messages q
WHERE q.thread_id = $1 AND q.direction = 'q'
  AND NOT EXISTS (
    SELECT 1 FROM qa_messages a
    WHERE a.direction = 'a' AND a.reply_to = q.id
  );

-- name: ListMessagesByThread :many
SELECT * FROM qa_messages
WHERE thread_id = $1
ORDER BY created_at ASC;

-- name: GetMessageByID :one
SELECT * FROM qa_messages WHERE id = $1;

-- name: MarkMessageRead :exec
UPDATE qa_messages SET read_at = NOW()
WHERE id = $1 AND read_at IS NULL;

-- name: GetMessageByCiphertextRef :one
SELECT m.*, t.user_id AS thread_user_id, t.shaykh_id AS thread_shaykh_id
FROM qa_messages m JOIN qa_threads t ON t.id = m.thread_id
WHERE m.ciphertext_ref = $1
LIMIT 1;

-- name: CreateAuditLog :exec
INSERT INTO qa_audit_log (user_id, event_type, device_id, ip)
VALUES ($1, $2, $3, $4);
