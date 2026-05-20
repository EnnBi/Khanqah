package handler

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
	dbgen "khanqah/api/internal/db/generated"
)

func ListBugReports(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		status := r.URL.Query().Get("status")
		if status != "" {
			rows, err := q.ListBugReportsByStatus(r.Context(), dbgen.BugReportStatus(status))
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			writeJSON(w, http.StatusOK, rows)
			return
		}
		rows, err := q.ListBugReports(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

func SubmitBugReport(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var req dbgen.CreateBugReportParams
		if err := decodeJSON(r, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		row, err := q.CreateBugReport(r.Context(), req)
		if err != nil {
			// ON CONFLICT DO NOTHING returns no rows — treat as already submitted
			w.WriteHeader(http.StatusOK)
			return
		}
		writeJSON(w, http.StatusCreated, row)
	}
}
