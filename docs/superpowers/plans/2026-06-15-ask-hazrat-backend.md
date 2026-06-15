# Ask Hazrat — Backend Q&A Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Go backend foundation for the end-to-end-encrypted Ask Hazrat Q&A feature: a `shaykh` role, schema for public-key registry and encrypted messages, key-distribution + message + presigned-upload endpoints, and content-free push — storing only ciphertext and metadata.

**Architecture:** New Postgres tables (`device_keys`, `qa_threads`, `qa_messages`, `qa_audit_log`) added via a golang-migrate migration. sqlc generates typed queries. New HTTP handlers register on the existing Chi router under `/api`, reusing `RequireAuth`, the R2 storage client, and the FCM client. Authorization and request-parsing logic that is pure (no DB) lives in a new `internal/qa` package and is unit-tested TDD-style; DB-backed handlers are verified by build + curl smoke tests, matching the existing codebase convention.

**Tech Stack:** Go 1.26, Chi v5 router, pgx/v5 + sqlc, golang-migrate, Cloudflare R2 (S3 SDK), FCM v1.

This is **Plan 1 of 3** for Ask Hazrat Phase 1. The user-app plan and Shaykh-app plan depend on the endpoints built here.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/migrations/006_qa.up.sql` / `.down.sql` | `shaykh` role enum value + four Q&A tables + indexes |
| `backend/internal/db/query/device_keys.sql` | sqlc queries for the public-key registry |
| `backend/internal/db/query/qa.sql` | sqlc queries for threads, messages, audit log |
| `backend/internal/db/generated/*` | sqlc output (regenerated, not hand-edited) |
| `backend/internal/qa/authorize.go` | Pure helpers: thread access check, message-request validation |
| `backend/internal/qa/authorize_test.go` | Unit tests for the pure helpers |
| `backend/internal/handler/qa_keys.go` | `POST /keys`, `GET /keys/shaykh`, `GET /keys/{userId}` |
| `backend/internal/handler/qa_upload.go` | `POST /qa/upload` (presigned R2 PUT for encrypted blobs) |
| `backend/internal/handler/qa_messages.go` | `POST /qa/messages`, `GET /qa/threads`, `GET /qa/messages`, `POST /qa/messages/{id}/read` |
| `backend/internal/handler/qa_push.go` | Content-free per-user push helper |
| `backend/cmd/server/main.go` | Route registration (modify) |

All commands below run from `backend/` unless noted. `DATABASE_URL` must be exported (the Makefile reads it).

---

### Task 1: Migration — `shaykh` role + Q&A tables

**Files:**
- Create: `backend/migrations/006_qa.up.sql`
- Create: `backend/migrations/006_qa.down.sql`

- [ ] **Step 1: Write the up migration**

Create `backend/migrations/006_qa.up.sql`:

```sql
-- Add the single-Shaykh role to the existing user_role enum.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'shaykh';

-- Public keys only. Supports rotation and future multi-device.
CREATE TABLE device_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  public_key  BYTEA NOT NULL,
  algo        TEXT NOT NULL DEFAULT 'x25519',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at  TIMESTAMPTZ
);
CREATE INDEX idx_device_keys_user_active ON device_keys (user_id) WHERE revoked_at IS NULL;

CREATE TABLE qa_threads (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shaykh_id       UUID NOT NULL REFERENCES users(id),
  status          TEXT NOT NULL DEFAULT 'open',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_threads_user ON qa_threads (user_id, last_message_at DESC);
CREATE INDEX idx_qa_threads_shaykh ON qa_threads (shaykh_id, last_message_at DESC);

CREATE TABLE qa_messages (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id          UUID NOT NULL REFERENCES qa_threads(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES users(id),
  recipient_id       UUID NOT NULL REFERENCES users(id),
  direction          TEXT NOT NULL,            -- 'q' | 'a'
  content_type       TEXT NOT NULL,            -- 'text' | 'audio'
  ciphertext_ref     TEXT,                     -- R2 object key (audio)
  ciphertext_inline  BYTEA,                    -- inline ciphertext (text)
  enc_cek            BYTEA NOT NULL,
  nonce_key          BYTEA NOT NULL,
  nonce_payload      BYTEA NOT NULL,
  sender_key_id      UUID NOT NULL REFERENCES device_keys(id),
  byte_size          BIGINT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at       TIMESTAMPTZ,
  read_at            TIMESTAMPTZ
);
CREATE INDEX idx_qa_messages_thread ON qa_messages (thread_id, created_at);
CREATE INDEX idx_qa_messages_recipient_unread ON qa_messages (recipient_id) WHERE read_at IS NULL;

CREATE TABLE qa_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  event_type  TEXT NOT NULL,   -- login | device_register | key_gen | msg_sent | msg_delivered | msg_read
  device_id   TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_qa_audit_user ON qa_audit_log (user_id, created_at DESC);
```

- [ ] **Step 2: Write the down migration**

Create `backend/migrations/006_qa.down.sql`:

```sql
DROP TABLE IF EXISTS qa_audit_log;
DROP TABLE IF EXISTS qa_messages;
DROP TABLE IF EXISTS qa_threads;
DROP TABLE IF EXISTS device_keys;
-- Note: Postgres cannot drop a value from an enum; 'shaykh' remains on the enum.
-- This is harmless and the down migration is otherwise complete.
```

- [ ] **Step 3: Apply the migration**

Run: `make migrate-up`
Expected: output ends with `6/u qa` (golang-migrate applying version 6) and no error.

> Note: `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block in older Postgres, but golang-migrate runs each migration file in its own transaction. On Postgres 12+ `ADD VALUE` is allowed in a transaction *unless* the value is used in the same transaction — we do not use it here, so it succeeds. The project runs Postgres 16.

- [ ] **Step 4: Verify the down migration, then re-apply**

Run: `make migrate-down`
Expected: `6/d qa` and no error; the four tables are dropped.

Run: `make migrate-up`
Expected: `6/u qa` re-applied cleanly.

- [ ] **Step 5: Commit**

```bash
git add backend/migrations/006_qa.up.sql backend/migrations/006_qa.down.sql
git commit -m "feat(backend): qa schema — shaykh role, device_keys, qa tables"
```

---

### Task 2: sqlc queries for the key registry

**Files:**
- Create: `backend/internal/db/query/device_keys.sql`
- Modify: `backend/internal/db/query/users.sql` (add one query)

- [ ] **Step 1: Write the device-key queries**

Create `backend/internal/db/query/device_keys.sql`:

```sql
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
```

- [ ] **Step 2: Add the shaykh lookup to users queries**

Append to `backend/internal/db/query/users.sql`:

```sql
-- name: GetShaykhUserID :one
SELECT id FROM users WHERE role = 'shaykh' ORDER BY created_at LIMIT 1;
```

- [ ] **Step 3: Regenerate sqlc code**

Run: `make sqlc`
Expected: no output, exit 0. New methods appear in `internal/db/generated/device_keys.sql.go` and a `GetShaykhUserID` method in `users.sql.go`.

- [ ] **Step 4: Verify it compiles**

Run: `go build ./...`
Expected: exit 0, no output.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/db/query/device_keys.sql backend/internal/db/query/users.sql backend/internal/db/generated/
git commit -m "feat(backend): sqlc queries for device_keys + shaykh lookup"
```

---

### Task 3: sqlc queries for threads, messages, audit log

**Files:**
- Create: `backend/internal/db/query/qa.sql`

- [ ] **Step 1: Write the Q&A queries**

Create `backend/internal/db/query/qa.sql`:

```sql
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
  sender_key_id, byte_size
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
RETURNING *;

-- name: ListMessagesByThread :many
SELECT * FROM qa_messages
WHERE thread_id = $1
ORDER BY created_at ASC;

-- name: GetMessageByID :one
SELECT * FROM qa_messages WHERE id = $1;

-- name: MarkMessageRead :exec
UPDATE qa_messages SET read_at = NOW()
WHERE id = $1 AND read_at IS NULL;

-- name: CreateAuditLog :exec
INSERT INTO qa_audit_log (user_id, event_type, device_id, ip)
VALUES ($1, $2, $3, $4);
```

- [ ] **Step 2: Regenerate and compile**

Run: `make sqlc && go build ./...`
Expected: exit 0. `internal/db/generated/qa.sql.go` now contains `CreateQAThread`, `CreateQAMessage`, `CreateQAMessageParams`, `ListMessagesByThread`, etc.

- [ ] **Step 3: Commit**

```bash
git add backend/internal/db/query/qa.sql backend/internal/db/generated/
git commit -m "feat(backend): sqlc queries for qa threads, messages, audit"
```

---

### Task 4: Pure authorization + validation helpers (TDD)

This is the only pure (non-DB) logic, so it gets unit tests in the style of `internal/auth/jwt_test.go`.

**Files:**
- Create: `backend/internal/qa/authorize.go`
- Test: `backend/internal/qa/authorize_test.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/qa/authorize_test.go`:

```go
package qa

import "testing"

func TestCanAccessThread(t *testing.T) {
	const user = "11111111-1111-1111-1111-111111111111"
	const shaykh = "22222222-2222-2222-2222-222222222222"
	const stranger = "33333333-3333-3333-3333-333333333333"

	cases := []struct {
		name      string
		requester string
		threadUsr string
		threadShk string
		want      bool
	}{
		{"questioner allowed", user, user, shaykh, true},
		{"shaykh allowed", shaykh, user, shaykh, true},
		{"stranger denied", stranger, user, shaykh, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := CanAccessThread(c.requester, c.threadUsr, c.threadShk); got != c.want {
				t.Fatalf("CanAccessThread = %v, want %v", got, c.want)
			}
		})
	}
}

func TestValidateMessageRequest(t *testing.T) {
	valid := MessageRequest{
		Direction:   "q",
		ContentType: "text",
		EncCEK:      "AAAA",
		NonceKey:    "AAAA",
		NoncePayload: "AAAA",
		SenderKeyID: "44444444-4444-4444-4444-444444444444",
		CiphertextInline: "AAAA",
	}
	if err := ValidateMessageRequest(valid); err != nil {
		t.Fatalf("valid request rejected: %v", err)
	}

	badDir := valid
	badDir.Direction = "x"
	if err := ValidateMessageRequest(badDir); err == nil {
		t.Fatal("expected error for bad direction")
	}

	audioNoRef := valid
	audioNoRef.ContentType = "audio"
	audioNoRef.CiphertextInline = ""
	audioNoRef.CiphertextRef = ""
	if err := ValidateMessageRequest(audioNoRef); err == nil {
		t.Fatal("expected error: audio message needs ciphertext_ref")
	}

	textNoInline := valid
	textNoInline.CiphertextInline = ""
	if err := ValidateMessageRequest(textNoInline); err == nil {
		t.Fatal("expected error: text message needs ciphertext_inline")
	}

	badB64 := valid
	badB64.EncCEK = "!!!notbase64!!!"
	if err := ValidateMessageRequest(badB64); err == nil {
		t.Fatal("expected error for invalid base64 enc_cek")
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `go test ./internal/qa/ -v`
Expected: FAIL — `undefined: CanAccessThread`, `undefined: MessageRequest`, etc.

- [ ] **Step 3: Write the implementation**

Create `backend/internal/qa/authorize.go`:

```go
// Package qa holds pure (DB-free) helpers for the Ask Hazrat Q&A feature:
// thread authorization and message-request validation.
package qa

import (
	"encoding/base64"
	"fmt"
)

// MessageRequest is the JSON body for POST /qa/messages. Binary fields are
// base64-encoded strings; the handler decodes them after validation.
type MessageRequest struct {
	ThreadID         string `json:"thread_id"`          // optional; empty => create/find thread (questions only)
	Direction        string `json:"direction"`          // "q" | "a"
	ContentType      string `json:"content_type"`       // "text" | "audio"
	CiphertextRef    string `json:"ciphertext_ref"`     // R2 key (audio)
	CiphertextInline string `json:"ciphertext_inline"`  // base64 ciphertext (text)
	EncCEK           string `json:"enc_cek"`            // base64
	NonceKey         string `json:"nonce_key"`          // base64
	NoncePayload     string `json:"nonce_payload"`      // base64
	SenderKeyID      string `json:"sender_key_id"`      // device_keys.id
	ByteSize         int64  `json:"byte_size"`
}

// CanAccessThread reports whether requester is a participant of a thread owned
// by threadUserID with the given threadShaykhID.
func CanAccessThread(requesterID, threadUserID, threadShaykhID string) bool {
	return requesterID == threadUserID || requesterID == threadShaykhID
}

func isBase64(s string) bool {
	_, err := base64.StdEncoding.DecodeString(s)
	return err == nil
}

// ValidateMessageRequest checks structural validity without touching the DB.
func ValidateMessageRequest(m MessageRequest) error {
	if m.Direction != "q" && m.Direction != "a" {
		return fmt.Errorf("direction must be 'q' or 'a'")
	}
	if m.ContentType != "text" && m.ContentType != "audio" {
		return fmt.Errorf("content_type must be 'text' or 'audio'")
	}
	if m.SenderKeyID == "" {
		return fmt.Errorf("sender_key_id is required")
	}
	for name, v := range map[string]string{
		"enc_cek": m.EncCEK, "nonce_key": m.NonceKey, "nonce_payload": m.NoncePayload,
	} {
		if v == "" {
			return fmt.Errorf("%s is required", name)
		}
		if !isBase64(v) {
			return fmt.Errorf("%s is not valid base64", name)
		}
	}
	switch m.ContentType {
	case "text":
		if m.CiphertextInline == "" {
			return fmt.Errorf("ciphertext_inline is required for text messages")
		}
		if !isBase64(m.CiphertextInline) {
			return fmt.Errorf("ciphertext_inline is not valid base64")
		}
	case "audio":
		if m.CiphertextRef == "" {
			return fmt.Errorf("ciphertext_ref is required for audio messages")
		}
	}
	return nil
}

// DecodeField decodes a base64 field that has already passed validation.
func DecodeField(s string) []byte {
	b, _ := base64.StdEncoding.DecodeString(s)
	return b
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `go test ./internal/qa/ -v`
Expected: PASS — `TestCanAccessThread` and `TestValidateMessageRequest` (all subtests ok).

- [ ] **Step 5: Commit**

```bash
git add backend/internal/qa/
git commit -m "feat(backend): qa pure authorization + request validation (TDD)"
```

---

### Task 5: Key registry handlers

**Files:**
- Create: `backend/internal/handler/qa_keys.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write the handlers**

Create `backend/internal/handler/qa_keys.go`:

```go
package handler

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/middleware"
)

// RegisterDeviceKey godoc
//	@Summary	Register or rotate this device's public key
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/keys [post]
func RegisterDeviceKey(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req struct {
			PublicKey string `json:"public_key"` // base64
			Algo      string `json:"algo"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		pub, err := base64.StdEncoding.DecodeString(req.PublicKey)
		if err != nil || len(pub) == 0 {
			writeError(w, http.StatusBadRequest, "public_key must be base64")
			return
		}
		if req.Algo == "" {
			req.Algo = "x25519"
		}
		var userID pgtype.UUID
		_ = userID.Scan(claims.UserID)

		// Rotate: revoke previous active keys, then insert the new one.
		if err := q.RevokeActiveDeviceKeys(r.Context(), userID); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		key, err := q.CreateDeviceKey(r.Context(), dbgen.CreateDeviceKeyParams{
			UserID: userID, PublicKey: pub, Algo: req.Algo,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		_ = q.CreateAuditLog(r.Context(), dbgen.CreateAuditLogParams{
			UserID: userID, EventType: "key_gen",
		})
		writeJSON(w, http.StatusCreated, map[string]string{
			"id": uuidString(key.ID),
		})
	}
}

// GetShaykhKey godoc
//	@Summary	Get the current Shaykh public key
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/keys/shaykh [get]
func GetShaykhKey(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		shaykhID, err := q.GetShaykhUserID(r.Context())
		if err != nil {
			writeError(w, http.StatusNotFound, "no shaykh configured")
			return
		}
		key, err := q.GetActiveDeviceKeyByUser(r.Context(), shaykhID)
		if err != nil {
			writeError(w, http.StatusNotFound, "shaykh has no key registered")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"user_id":    uuidString(shaykhID),
			"key_id":     uuidString(key.ID),
			"public_key": base64.StdEncoding.EncodeToString(key.PublicKey),
			"algo":       key.Algo,
		})
	}
}

// GetUserKey godoc
//	@Summary	Get a user's current public key (Shaykh only, to encrypt answers)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/keys/{userId} [get]
func GetUserKey(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil || claims.Role != "shaykh" {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		var targetID pgtype.UUID
		if err := targetID.Scan(chi.URLParam(r, "userId")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid user id")
			return
		}
		key, err := q.GetActiveDeviceKeyByUser(r.Context(), targetID)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "user has no key")
			} else {
				writeError(w, http.StatusInternalServerError, "internal error")
			}
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"user_id":    chi.URLParam(r, "userId"),
			"key_id":     uuidString(key.ID),
			"public_key": base64.StdEncoding.EncodeToString(key.PublicKey),
			"algo":       key.Algo,
		})
	}
}
```

- [ ] **Step 2: Add the `uuidString` helper**

Append to `backend/internal/handler/respond.go`:

```go
import "github.com/jackc/pgx/v5/pgtype"

// uuidString renders a pgtype.UUID as its canonical 36-char string.
func uuidString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	b := u.Bytes
	const hex = "0123456789abcdef"
	out := make([]byte, 36)
	pos := 0
	for i := 0; i < 16; i++ {
		if i == 4 || i == 6 || i == 8 || i == 10 {
			out[pos] = '-'
			pos++
		}
		out[pos] = hex[b[i]>>4]
		out[pos+1] = hex[b[i]&0x0f]
		pos += 2
	}
	return string(out)
}
```

> If `respond.go` already imports packages, add `pgtype` to the existing import block rather than adding a second `import` statement. Verify the import compiles in Step 4.

- [ ] **Step 3: Register the routes**

In `backend/cmd/server/main.go`, inside the **"Listener (any valid JWT)"** group (the `r.Group` that already has `middleware.RequireAuth(jwtSecret)`), add:

```go
			// Ask Hazrat — key registry
			r.Post("/keys", handler.RegisterDeviceKey(pool))
			r.Get("/keys/shaykh", handler.GetShaykhKey(pool))
			r.Get("/keys/{userId}", handler.GetUserKey(pool))
```

- [ ] **Step 4: Build**

Run: `go build ./...`
Expected: exit 0, no output.

- [ ] **Step 5: Smoke test**

Start the server (`make run` in another shell). Obtain a JWT for a test user via the OTP flow, then:

```bash
TOKEN=<paste access token>
curl -s -X POST localhost:8090/api/keys \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"public_key":"'"$(printf 'testpublickey32byteslong________' | base64)"'","algo":"x25519"}'
```
Expected: `{"id":"<uuid>"}` with HTTP 201.

```bash
curl -s localhost:8090/api/keys/shaykh -H "Authorization: Bearer $TOKEN"
```
Expected: `404 {"error":"no shaykh configured"}` until a user is given the `shaykh` role (via `PUT /admin/team/{id}/role` body `{"role":"shaykh"}`) and registers a key; then `200` with the key JSON.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handler/qa_keys.go backend/internal/handler/respond.go backend/cmd/server/main.go
git commit -m "feat(backend): qa key registry endpoints (register, shaykh, user)"
```

---

### Task 6: Presigned upload for encrypted blobs

**Files:**
- Create: `backend/internal/handler/qa_upload.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write the handler**

Create `backend/internal/handler/qa_upload.go`:

```go
package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"khanqah/api/internal/middleware"
	"khanqah/api/internal/storage"
)

// GenerateQAUploadURL godoc
//	@Summary	Presigned R2 PUT for an already-encrypted Q&A audio blob
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/upload [post]
func GenerateQAUploadURL(r2 *storage.R2Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req struct {
			ThreadID string `json:"thread_id"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		_ = pgtype.UUID{} // thread_id is advisory for key naming only

		// Encrypted blobs are opaque octet-streams; the object key segregates by user.
		fileKey := fmt.Sprintf("qa/%s/%d.bin", claims.UserID, time.Now().UnixNano())

		uploadURL, err := r2.GenerateUploadURL(r.Context(), fileKey, "application/octet-stream")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate upload URL")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"upload_url": uploadURL,
			"file_key":   fileKey,
		})
	}
}
```

> No `cdn_url` is returned: encrypted Q&A blobs are fetched back through the API/CDN by object key (`ciphertext_ref`), not served as public content. The user/Shaykh apps download by key and decrypt locally.

- [ ] **Step 2: Register the route**

In `main.go`, in the same Listener group as the key routes, add:

```go
			r.Post("/qa/upload", handler.GenerateQAUploadURL(r2))
```

- [ ] **Step 3: Build**

Run: `go build ./...`
Expected: exit 0.

- [ ] **Step 4: Smoke test**

```bash
curl -s -X POST localhost:8090/api/qa/upload \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"thread_id":""}'
```
Expected: JSON with `upload_url` (a long R2 presigned URL) and `file_key` like `qa/<uuid>/<nanos>.bin`.

- [ ] **Step 5: Commit**

```bash
git add backend/internal/handler/qa_upload.go backend/cmd/server/main.go
git commit -m "feat(backend): qa presigned upload for encrypted blobs"
```

---

### Task 7: Content-free per-user push helper

**Files:**
- Create: `backend/internal/handler/qa_push.go`

- [ ] **Step 1: Write the helper**

Create `backend/internal/handler/qa_push.go`:

```go
package handler

import (
	"context"
	"log"

	"khanqah/api/internal/fcm"
)

// Content-free push strings. NEVER include message content here.
const (
	pushNewQuestionTitle = "نیا سوال"            // "New question"
	pushNewQuestionBody  = "آپ کے پاس ایک نیا سوال ہے۔"
	pushNewAnswerTitle   = "نیا جواب"            // "New answer"
	pushNewAnswerBody    = "آپ کو شیخ کی طرف سے جواب موصول ہوا ہے۔"
)

// userTopic is the per-user FCM topic both apps subscribe to on login.
// Topic names allow [a-zA-Z0-9-_.~%]; a UUID with hyphens is valid.
func userTopic(userID string) string { return "user-" + userID }

// notifyNewMessage sends a content-free push to the recipient. Fire-and-forget;
// failures are logged, never surfaced to the sender. No-op if fcmClient is nil.
func notifyNewMessage(fcmClient *fcm.Client, recipientID, direction string) {
	title, body := pushNewAnswerTitle, pushNewAnswerBody
	if direction == "q" {
		title, body = pushNewQuestionTitle, pushNewQuestionBody
	}
	go func() {
		if err := fcmClient.SendToTopic(context.Background(), userTopic(recipientID), title, body); err != nil {
			log.Printf("qa push to %s: %v", recipientID, err)
		}
	}()
}
```

- [ ] **Step 2: Build**

Run: `go build ./...`
Expected: exit 0. (`notifyNewMessage` is unused until Task 8 — Go allows unused package-level functions, so this compiles.)

- [ ] **Step 3: Commit**

```bash
git add backend/internal/handler/qa_push.go
git commit -m "feat(backend): content-free per-user push helper"
```

---

### Task 8: Message + thread endpoints

**Files:**
- Create: `backend/internal/handler/qa_messages.go`
- Modify: `backend/cmd/server/main.go`

- [ ] **Step 1: Write the handlers**

Create `backend/internal/handler/qa_messages.go`:

```go
package handler

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/fcm"
	"khanqah/api/internal/middleware"
	"khanqah/api/internal/qa"
)

func textPtr(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{}
	}
	return pgtype.Text{String: s, Valid: true}
}

// SendQAMessage godoc
//	@Summary	Submit an encrypted question or answer
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages [post]
func SendQAMessage(pool *pgxpool.Pool, fcmClient *fcm.Client) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req qa.MessageRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if err := qa.ValidateMessageRequest(req); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}

		var senderID pgtype.UUID
		_ = senderID.Scan(claims.UserID)
		var senderKeyID pgtype.UUID
		if err := senderKeyID.Scan(req.SenderKeyID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid sender_key_id")
			return
		}
		// The sender_key must belong to the sender.
		sk, err := q.GetDeviceKeyByID(r.Context(), senderKeyID)
		if err != nil || uuidString(sk.UserID) != claims.UserID {
			writeError(w, http.StatusBadRequest, "sender_key_id does not belong to you")
			return
		}

		shaykhID, err := q.GetShaykhUserID(r.Context())
		if err != nil {
			writeError(w, http.StatusServiceUnavailable, "no shaykh configured")
			return
		}

		// Resolve the thread + recipient based on direction.
		var thread dbgen.QaThread
		var recipientID pgtype.UUID
		switch req.Direction {
		case "q": // user → shaykh
			if req.ThreadID != "" {
				var tid pgtype.UUID
				if err := tid.Scan(req.ThreadID); err != nil {
					writeError(w, http.StatusBadRequest, "invalid thread_id")
					return
				}
				thread, err = q.GetThreadByID(r.Context(), tid)
				if err != nil || uuidString(thread.UserId) != claims.UserID {
					writeError(w, http.StatusForbidden, "not your thread")
					return
				}
			} else {
				thread, err = q.GetOpenThreadForUser(r.Context(), dbgen.GetOpenThreadForUserParams{
					UserId: senderID, ShaykhId: shaykhID,
				})
				if errors.Is(err, pgx.ErrNoRows) {
					thread, err = q.CreateQAThread(r.Context(), dbgen.CreateQAThreadParams{
						UserId: senderID, ShaykhId: shaykhID,
					})
				}
				if err != nil {
					writeError(w, http.StatusInternalServerError, "internal error")
					return
				}
			}
			recipientID = shaykhID
		case "a": // shaykh → user
			if claims.Role != "shaykh" {
				writeError(w, http.StatusForbidden, "only the shaykh may answer")
				return
			}
			var tid pgtype.UUID
			if err := tid.Scan(req.ThreadID); err != nil {
				writeError(w, http.StatusBadRequest, "thread_id required for answers")
				return
			}
			thread, err = q.GetThreadByID(r.Context(), tid)
			if err != nil {
				writeError(w, http.StatusNotFound, "thread not found")
				return
			}
			recipientID = thread.UserId
		}

		msg, err := q.CreateQAMessage(r.Context(), dbgen.CreateQAMessageParams{
			ThreadID:         thread.ID,
			SenderID:         senderID,
			RecipientID:      recipientID,
			Direction:        req.Direction,
			ContentType:      req.ContentType,
			CiphertextRef:    textPtr(req.CiphertextRef),
			CiphertextInline: qa.DecodeField(req.CiphertextInline),
			EncCek:           qa.DecodeField(req.EncCEK),
			NonceKey:         qa.DecodeField(req.NonceKey),
			NoncePayload:     qa.DecodeField(req.NoncePayload),
			SenderKeyID:      senderKeyID,
			ByteSize:         req.ByteSize,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}

		newStatus := "open"
		if req.Direction == "a" {
			newStatus = "answered"
		}
		_ = q.TouchThread(r.Context(), dbgen.TouchThreadParams{ID: thread.ID, Status: newStatus})
		_ = q.CreateAuditLog(r.Context(), dbgen.CreateAuditLogParams{
			UserID: senderID, EventType: "msg_sent",
		})

		notifyNewMessage(fcmClient, uuidString(recipientID), req.Direction)
		writeJSON(w, http.StatusCreated, map[string]string{
			"id":        uuidString(msg.ID),
			"thread_id": uuidString(thread.ID),
		})
	}
}

// ListQAThreads godoc
//	@Summary	List threads (own for users, full queue for the shaykh)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/threads [get]
func ListQAThreads(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var id pgtype.UUID
		_ = id.Scan(claims.UserID)
		if claims.Role == "shaykh" {
			rows, err := q.ListThreadsForShaykh(r.Context(), id)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			writeJSON(w, http.StatusOK, rows)
			return
		}
		rows, err := q.ListThreadsForUser(r.Context(), id)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// ListQAMessages godoc
//	@Summary	List encrypted messages in a thread (participants only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages [get]
func ListQAMessages(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var tid pgtype.UUID
		if err := tid.Scan(r.URL.Query().Get("thread_id")); err != nil {
			writeError(w, http.StatusBadRequest, "thread_id required")
			return
		}
		thread, err := q.GetThreadByID(r.Context(), tid)
		if err != nil {
			writeError(w, http.StatusNotFound, "thread not found")
			return
		}
		if !qa.CanAccessThread(claims.UserID, uuidString(thread.UserId), uuidString(thread.ShaykhId)) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		rows, err := q.ListMessagesByThread(r.Context(), tid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// MarkQAMessageRead godoc
//	@Summary	Mark a message as read (recipient only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/messages/{id}/read [post]
func MarkQAMessageRead(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var mid pgtype.UUID
		if err := mid.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		msg, err := q.GetMessageByID(r.Context(), mid)
		if err != nil {
			writeError(w, http.StatusNotFound, "not found")
			return
		}
		if uuidString(msg.RecipientID) != claims.UserID {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		if err := q.MarkMessageRead(r.Context(), mid); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		var uid pgtype.UUID
		_ = uid.Scan(claims.UserID)
		_ = q.CreateAuditLog(r.Context(), dbgen.CreateAuditLogParams{UserID: uid, EventType: "msg_read"})
		w.WriteHeader(http.StatusNoContent)
	}
}

var _ = base64.StdEncoding // base64 used indirectly via qa helpers; keep import stable
```

> **Type-name caution:** sqlc derives Go field names from columns. After `make sqlc`, open `internal/db/generated/qa.sql.go` and confirm the exact field names on `QaThread` (`UserId` vs `UserID`) and `CreateQAMessageParams` (`EncCek` vs `EncCEK`, `CiphertextInline`, etc.). sqlc's default casing maps `enc_cek`→`EncCek`, `user_id`→`UserID` or `UserId` depending on its initialisms config. **Match the generated names exactly** — adjust the handler field names in this step to whatever sqlc emitted. Remove the trailing `var _ = base64...` line if `base64` ends up unused.

- [ ] **Step 2: Register the routes**

In `main.go`, in the Listener group, add:

```go
			r.Post("/qa/messages", handler.SendQAMessage(pool, fcmClient))
			r.Get("/qa/threads", handler.ListQAThreads(pool))
			r.Get("/qa/messages", handler.ListQAMessages(pool))
			r.Post("/qa/messages/{id}/read", handler.MarkQAMessageRead(pool))
```

- [ ] **Step 3: Build, fixing field names against generated code**

Run: `go build ./...`
Expected: exit 0. If it fails with `unknown field EncCEK in struct literal`, open the generated file, read the real field name, and correct the handler. Re-run until it builds.

- [ ] **Step 4: Run the pure-logic tests**

Run: `go test ./internal/qa/ -v`
Expected: PASS (unchanged from Task 4 — confirms the helpers still compile against handler usage).

- [ ] **Step 5: End-to-end smoke test**

With the server running, a test user JWT (`$TOKEN`), and a Shaykh user that has the `shaykh` role and a registered key:

```bash
# Send a text question (ciphertext fields are dummy base64 for the smoke test)
B64=$(printf 'x' | base64)
curl -s -X POST localhost:8090/api/qa/messages -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "direction":"q","content_type":"text","ciphertext_inline":"'"$B64"'",
    "enc_cek":"'"$B64"'","nonce_key":"'"$B64"'","nonce_payload":"'"$B64"'",
    "sender_key_id":"<your registered key id>","byte_size":1}'
```
Expected: `201 {"id":"...","thread_id":"..."}`.

```bash
curl -s localhost:8090/api/qa/threads -H "Authorization: Bearer $TOKEN"
```
Expected: a JSON array with one thread (status `open`).

```bash
curl -s "localhost:8090/api/qa/messages?thread_id=<thread_id>" -H "Authorization: Bearer $TOKEN"
```
Expected: a JSON array with the one message; `enc_cek`/`nonce_*` present as base64, no plaintext fields.

Then verify a stranger (a different user's `$TOKEN2`) gets `403` on that thread's messages.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/handler/qa_messages.go backend/cmd/server/main.go
git commit -m "feat(backend): qa message + thread endpoints with participant gating"
```

---

### Task 9: Regenerate Swagger docs & final verification

**Files:**
- Modify: `backend/docs/*` (regenerated)

- [ ] **Step 1: Regenerate Swagger (if `swag` is installed)**

Run: `swag init -g cmd/server/main.go -o docs` (from `backend/`)
Expected: `docs/docs.go`, `docs/swagger.json`, `docs/swagger.yaml` updated with the new `qa` tag endpoints. If `swag` is not installed, skip this step — the annotations are already in the handlers and will be picked up next time docs are generated. Note the skip.

- [ ] **Step 2: Full build + test**

Run: `go build ./... && go vet ./... && go test ./...`
Expected: build exit 0; vet clean; all tests pass (including the existing `internal/auth` and `internal/middleware` tests plus the new `internal/qa` tests).

- [ ] **Step 3: Confirm migration round-trips on a clean DB**

Run: `make migrate-down && make migrate-up`
Expected: both succeed; tables drop and recreate.

- [ ] **Step 4: Commit**

```bash
git add backend/docs/
git commit -m "docs(backend): regenerate swagger for qa endpoints"
```

---

## Self-Review

**Spec coverage (against `2026-06-15-ask-hazrat-e2ee-qa-design.md`):**
- §3 key management → Task 1 (`device_keys`), Task 5 (register/rotate, get shaykh/user keys). ✓
- §4 schema → Task 1 (all four Phase-1 tables; `key_backups` is Phase 2, correctly excluded). ✓
- §5 API surface → Tasks 5, 6, 8 cover all eight Phase-1 endpoints. ✓
- §5 participant gating → Task 4 (`CanAccessThread`, TDD) + enforced in Tasks 5/8. ✓
- §5 server sets `sender_id` from JWT → Task 8 (uses `claims.UserID`, never client body). ✓
- §6 content-free push → Task 7 (Urdu generic strings, no content) wired in Task 8. ✓
- §11 audit log, no content → Task 1 table + `CreateAuditLog` calls in Tasks 5/8 (event types only). ✓
- §2 server stores only ciphertext → schema has no plaintext columns; handlers store decoded base64 bytes verbatim. ✓
- Single Shaykh resolution → `GetShaykhUserID` (Task 2). ✓

**Out of scope for this plan (correctly):** client-side crypto, translation/TTS, key recovery (`key_backups`, Phase 2), safety numbers (Phase 3), app push *subscription* to `user-<uuid>` topic (covered in the app plans).

**Placeholder scan:** No TBD/TODO; every step has concrete SQL/Go/commands and expected output.

**Type consistency:** Handlers reference sqlc-generated names (`CreateQAMessageParams`, `QaThread`, `GetOpenThreadForUserParams`). Task 8 Step 1/3 explicitly flag that sqlc's field-name casing (`EncCek` vs `EncCEK`, `UserId` vs `UserID`) must be matched against the actual generated file — this is the one place names can't be known until codegen runs, and the plan instructs verifying and adjusting at build time.
