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
	"video/mp4":       true,
	"video/webm":      true,
	"image/jpeg":      true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
}

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
