package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ListBugReports returns all open bug reports. Full implementation added in Task 18.
func ListBugReports(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, []any{})
	}
}
