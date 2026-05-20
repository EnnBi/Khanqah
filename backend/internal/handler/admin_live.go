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

		var req dbgen.CreateLiveSessionParams
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		if req.StreamUrl == "" {
			writeError(w, http.StatusBadRequest, "stream_url is required")
			return
		}
		req.StartedBy = startedBy

		row, err := q.CreateLiveSession(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, row)
	}
}

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
