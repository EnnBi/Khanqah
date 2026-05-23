package handler

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/storage"
)

// FinalizeRecording is called by the audio relay when a recording is complete.
// It uploads the MP3 from a local temp path to R2, creates a content entry, and
// updates the live session's recording_url.
//
// Secured with X-Internal-Secret header matching INTERNAL_SECRET env var.
func FinalizeRecording(pool *pgxpool.Pool, r2 *storage.R2Client) http.HandlerFunc {
	secret := os.Getenv("INTERNAL_SECRET")
	q := dbgen.New(pool)

	return func(w http.ResponseWriter, r *http.Request) {
		if secret != "" && r.Header.Get("X-Internal-Secret") != secret {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var body struct {
			SessionID       string `json:"session_id"`
			CategoryID      string `json:"category_id"`
			FilePath        string `json:"file_path"`
			DurationSeconds int32  `json:"duration_seconds"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if body.SessionID == "" || body.CategoryID == "" || body.FilePath == "" {
			writeError(w, http.StatusBadRequest, "session_id, category_id and file_path are required")
			return
		}

		var sessionUUID, categoryUUID pgtype.UUID
		if err := sessionUUID.Scan(body.SessionID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid session_id")
			return
		}
		if err := categoryUUID.Scan(body.CategoryID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid category_id")
			return
		}

		// Load session and category
		session, err := q.GetLiveSessionByID(r.Context(), sessionUUID)
		if err != nil {
			writeError(w, http.StatusNotFound, "session not found")
			return
		}
		cat, err := q.GetCategory(r.Context(), categoryUUID)
		if err != nil {
			writeError(w, http.StatusNotFound, "category not found")
			return
		}

		// Open temp file
		f, err := os.Open(body.FilePath)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not open recording file")
			return
		}
		defer f.Close()

		fi, err := f.Stat()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not stat recording file")
			return
		}
		fileSize := fi.Size()

		// Upload to R2
		fileKey := fmt.Sprintf("recordings/%s_%d.mp3", body.SessionID, time.Now().UnixNano())
		if err := r2.UploadFile(r.Context(), fileKey, "audio/mpeg", f, fileSize); err != nil {
			writeError(w, http.StatusInternalServerError, "upload failed")
			return
		}
		cdnURL := r2.CDNUrl(fileKey)

		// Create content entry
		dur := body.DurationSeconds
		sz := fileSize
		_, err = q.CreateContent(r.Context(), dbgen.CreateContentParams{
			TitleEn:    session.TitleEn,
			TitleUr:    session.TitleUr,
			Type:       cat.Type,
			CategoryID: categoryUUID,
			MediaUrl:   cdnURL,
			Duration:   &dur,
			FileSize:   &sz,
			IsVideo:    false,
			UploadedBy: session.StartedBy,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create content")
			return
		}

		// Update live session with recording URL
		q.SetLiveSessionRecordingURL(r.Context(), dbgen.SetLiveSessionRecordingURLParams{ //nolint:errcheck
			ID:           sessionUUID,
			RecordingUrl: &cdnURL,
		})

		// Clean up temp file
		os.Remove(body.FilePath)

		writeJSON(w, http.StatusOK, map[string]string{"cdn_url": cdnURL})
	}
}
