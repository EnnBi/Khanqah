package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

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
