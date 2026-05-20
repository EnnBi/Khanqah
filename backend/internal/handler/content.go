package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

var validContentTypes = map[dbgen.ContentType]bool{
	dbgen.ContentTypeBayan:    true,
	dbgen.ContentTypeClip:     true,
	dbgen.ContentTypeNazam:    true,
	dbgen.ContentTypeQuran:    true,
	dbgen.ContentTypeHamdNaat: true,
	dbgen.ContentTypeBook:     true,
	dbgen.ContentTypeMamulat:  true,
}

func ListContent(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		limit := int32(20)
		offset := int32(0)
		if l := r.URL.Query().Get("limit"); l != "" {
			if v, err := strconv.Atoi(l); err == nil {
				if v > 0 && v <= 100 {
					limit = int32(v)
				} else if v > 100 {
					limit = 100
				}
				// v <= 0: keep default
			}
		}
		if o := r.URL.Query().Get("offset"); o != "" {
			if v, err := strconv.Atoi(o); err == nil && v >= 0 {
				offset = int32(v)
			}
		}

		typeParam := r.URL.Query().Get("type")
		categoryParam := r.URL.Query().Get("category_id")

		if typeParam != "" {
			ct := dbgen.ContentType(typeParam)
			if !validContentTypes[ct] {
				writeError(w, http.StatusBadRequest, "invalid type parameter")
				return
			}
			rows, err := q.ListContentByType(r.Context(), dbgen.ListContentByTypeParams{
				Type:   ct,
				Limit:  limit,
				Offset: offset,
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			writeJSON(w, http.StatusOK, rows)
			return
		}

		if categoryParam != "" {
			var catID pgtype.UUID
			if err := catID.Scan(categoryParam); err != nil {
				writeError(w, http.StatusBadRequest, "invalid category_id")
				return
			}
			rows, err := q.ListContentByCategory(r.Context(), dbgen.ListContentByCategoryParams{
				CategoryID: catID,
				Limit:      limit,
				Offset:     offset,
			})
			if err != nil {
				writeError(w, http.StatusInternalServerError, "internal error")
				return
			}
			writeJSON(w, http.StatusOK, rows)
			return
		}

		rows, err := q.ListContent(r.Context(), dbgen.ListContentParams{
			Limit:  limit,
			Offset: offset,
		})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		writeJSON(w, http.StatusOK, rows)
	}
}

func GetContent(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		var id pgtype.UUID
		if err := id.Scan(chi.URLParam(r, "id")); err != nil {
			writeError(w, http.StatusBadRequest, "invalid id")
			return
		}
		row, err := q.GetContent(r.Context(), id)
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
