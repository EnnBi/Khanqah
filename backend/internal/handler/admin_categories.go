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
)

func CreateCategory(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var req dbgen.CreateCategoryParams
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		row, err := q.CreateCategory(r.Context(), req)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusCreated, row)
	}
}

func UpdateCategory(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		var req dbgen.UpdateCategoryParams
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid body")
			return
		}
		req.ID = id
		row, err := q.UpdateCategory(r.Context(), req)
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

func DeleteCategory(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		if err := q.DeleteCategory(r.Context(), id); err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
