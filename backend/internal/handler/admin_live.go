package handler

import (
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

const hlsStreamURL = "https://arrashid.ennbi.com/hls/stream.m3u8"

// StartLiveSession godoc
//	@Summary		Start live session
//	@Tags			admin
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			body	body		startLiveRequest	true	"Live session data"
//	@Success		201		{object}	object
//	@Failure		400		{object}	errorResponse
//	@Router			/admin/live/start [post]
func StartLiveSession(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		claims := middleware.ClaimsFromContext(r.Context())
		if claims == nil {
			writeError(w, http.StatusInternalServerError, "missing auth context")
			return
		}
		var startedBy pgtype.UUID
		startedBy.Scan(claims.UserID)

		var body struct {
			CategoryID string `json:"category_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.CategoryID == "" {
			writeError(w, http.StatusBadRequest, "category_id is required")
			return
		}

		var catID pgtype.UUID
		if err := catID.Scan(body.CategoryID); err != nil {
			writeError(w, http.StatusBadRequest, "invalid category_id")
			return
		}

		cat, err := q.GetCategory(r.Context(), catID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "category not found")
			return
		}

		row, err := q.CreateLiveSession(r.Context(), dbgen.CreateLiveSessionParams{
			TitleEn:   cat.NameEn,
			TitleUr:   cat.NameUr,
			StreamUrl: hlsStreamURL,
			StartedBy: startedBy,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, row)
	}
}

// EndLiveSession godoc
//	@Summary		End live session
//	@Tags			admin
//	@Produce		json
//	@Security		BearerAuth
//	@Param			id	path		string	true	"Live session UUID"
//	@Success		200	{object}	object
//	@Failure		404	{object}	errorResponse
//	@Router			/admin/live/end/{id} [post]
func EndLiveSession(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		row, err := q.EndLiveSession(r.Context(), id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeError(w, http.StatusNotFound, "not found")
			} else {
				writeError(w, http.StatusInternalServerError, "internal error")
			}
			return
		}
		writeJSON(w, http.StatusOK, row)
	}
}
