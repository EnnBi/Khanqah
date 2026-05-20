package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

// ListCategories godoc
//	@Summary		List categories
//	@Tags			categories
//	@Produce		json
//	@Success		200	{array}		object
//	@Router			/categories [get]
func ListCategories(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := q.ListCategories(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}
