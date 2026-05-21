package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"khanqah/api/internal/storage"
)

// allowed MIME types for upload
var allowedMIMETypes = map[string]bool{
	"audio/mpeg":      true,
	"audio/mp4":       true,
	"audio/ogg":       true,
	"audio/wav":       true,
	"video/mp4":           true,
	"video/webm":          true,
	"video/quicktime":     true,
	"video/x-m4v":        true,
	"image/jpeg":      true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
}

// GenerateUploadURL godoc
//	@Summary		Generate R2 upload URL
//	@Description	Returns a pre-signed PUT URL for direct upload to Cloudflare R2. Valid 15 minutes.
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			body	body		uploadURLRequest	true	"File info"
//	@Success		200		{object}	uploadURLResponse
//	@Failure		400		{object}	errorResponse
//	@Router			/admin/upload [post]
func GenerateUploadURL(r2 *storage.R2Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Filename    string `json:"filename"`
			ContentType string `json:"content_type"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Filename == "" {
			writeError(w, http.StatusBadRequest, "filename is required")
			return
		}
		if req.ContentType == "" {
			req.ContentType = "application/octet-stream"
		}
		if !allowedMIMETypes[req.ContentType] {
			writeError(w, http.StatusBadRequest, "unsupported content type")
			return
		}

		ext := strings.ToLower(filepath.Ext(req.Filename))
		fileKey := fmt.Sprintf("content/%d%s", time.Now().UnixNano(), ext)

		uploadURL, err := r2.GenerateUploadURL(r.Context(), fileKey, req.ContentType)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to generate upload URL")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{
			"upload_url": uploadURL,
			"file_key":   fileKey,
			"cdn_url":    r2.CDNUrl(fileKey),
		})
	}
}
