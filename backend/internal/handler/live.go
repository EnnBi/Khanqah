package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

// GetCurrentLive godoc
//	@Summary		Get current live session
//	@Description	Returns the active live session, or null if none is live.
//	@Tags			live
//	@Produce		json
//	@Success		200	{object}	object
//	@Router			/live/current [get]
func GetCurrentLive(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		row, err := q.GetCurrentLiveSession(r.Context())
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSON(w, http.StatusOK, nil)
			} else {
				writeError(w, http.StatusInternalServerError, "internal error")
			}
			return
		}
		writeJSON(w, http.StatusOK, row)
	}
}

// liveSessionGetter is the part of *dbgen.Queries the shared-link lookup needs.
type liveSessionGetter interface {
	GetLiveSessionByID(ctx context.Context, id pgtype.UUID) (dbgen.LiveSession, error)
}

// GetLiveSession godoc
//	@Summary		Get a live session by id
//	@Description	Backs shared broadcast links: returns the session whether it is still live or has ended.
//	@Tags			live
//	@Produce		json
//	@Param			id	path		string	true	"Live session ID"
//	@Success		200	{object}	object
//	@Failure		400	{object}	errorResponse
//	@Failure		404	{object}	errorResponse
//	@Router			/live/{id} [get]
func GetLiveSession(pool *pgxpool.Pool) http.HandlerFunc {
	return getLiveSession(dbgen.New(pool))
}

func getLiveSession(q liveSessionGetter) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		row, err := q.GetLiveSessionByID(r.Context(), id)
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
