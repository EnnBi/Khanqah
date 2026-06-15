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
//
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
//
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
//
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
