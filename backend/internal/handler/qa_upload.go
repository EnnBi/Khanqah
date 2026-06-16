package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/middleware"
	"khanqah/api/internal/qa"
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

// GenerateQADownloadURL godoc
//
//	@Summary	Presigned R2 GET for an encrypted Q&A blob (participants only)
//	@Tags		qa
//	@Security	BearerAuth
//	@Router		/qa/download [post]
func GenerateQADownloadURL(pool *pgxpool.Pool, r2 *storage.R2Client) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var req struct {
			FileKey string `json:"file_key"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.FileKey == "" {
			writeError(w, http.StatusBadRequest, "file_key is required")
			return
		}
		if !strings.HasPrefix(req.FileKey, "qa/") {
			writeError(w, http.StatusBadRequest, "invalid file_key")
			return
		}
		row, err := q.GetMessageByCiphertextRef(r.Context(), &req.FileKey)
		if err != nil {
			writeError(w, http.StatusNotFound, "blob not found")
			return
		}
		if !qa.CanAccessThread(claims.UserID, uuidString(row.ThreadUserID), uuidString(row.ThreadShaykhID)) {
			writeError(w, http.StatusForbidden, "forbidden")
			return
		}
		url, err := r2.GenerateDownloadURL(r.Context(), req.FileKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate download URL")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"download_url": url})
	}
}
