package handler

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"
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
