package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
	"khanqah/api/internal/middleware"
)

// GetProgress godoc
//	@Summary		Get listening progress
//	@Tags			me
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		object
//	@Failure		401	{object}	errorResponse
//	@Router			/me/progress [get]
func GetProgress(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var userID pgtype.UUID
		if err := userID.Scan(claims.UserID); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid user id")
			return
		}
		rows, err := q.ListProgressByUser(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// UpsertProgress godoc
//	@Summary		Update listening progress
//	@Tags			me
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			contentId	path		string				true	"Content UUID"
//	@Param			body		body		upsertProgressRequest	true	"Progress update"
//	@Success		200			{object}	object
//	@Failure		400			{object}	errorResponse
//	@Failure		401			{object}	errorResponse
//	@Router			/me/progress/{contentId} [put]
func UpsertProgress(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var userID pgtype.UUID
		if err := userID.Scan(claims.UserID); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid user id")
			return
		}

		var contentID pgtype.UUID
		if err := contentID.Scan(chi.URLParam(r, "contentId")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid contentId")
			return
		}

		var body struct {
			PositionSeconds int32 `json:"position_seconds"`
			Completed       bool  `json:"completed"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if body.PositionSeconds < 0 {
			writeError(w, http.StatusBadRequest, "position_seconds must be non-negative")
			return
		}

		row, err := q.UpsertProgress(r.Context(), dbgen.UpsertProgressParams{
			UserID:          userID,
			ContentID:       contentID,
			PositionSeconds: body.PositionSeconds,
			Completed:       body.Completed,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, row)
	}
}

// GetPlaylists godoc
//	@Summary		Get playlists
//	@Tags			me
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		object
//	@Failure		401	{object}	errorResponse
//	@Router			/me/playlists [get]
func GetPlaylists(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var userID pgtype.UUID
		if err := userID.Scan(claims.UserID); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid user id")
			return
		}
		rows, err := q.ListPlaylists(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

// GetDownloads godoc
//	@Summary		Get downloads
//	@Tags			me
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		object
//	@Failure		401	{object}	errorResponse
//	@Router			/me/downloads [get]
func GetDownloads(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		var userID pgtype.UUID
		if err := userID.Scan(claims.UserID); err != nil {
			writeError(w, http.StatusUnauthorized, "invalid user id")
			return
		}
		rows, err := q.ListDownloadsByUser(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}
