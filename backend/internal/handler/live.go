package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

func GetCurrentLive(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		row, err := q.GetCurrentLiveSession(r.Context())
		if err != nil {
			// no live session — return null, not an error
			writeJSON(w, http.StatusOK, nil)
			return
		}
		writeJSON(w, http.StatusOK, row)
	}
}
