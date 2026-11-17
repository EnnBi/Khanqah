package handler

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	dbgen "khanqah/api/internal/db/generated"
)

const maxSearchRunes = 100

// contentSearch is GET /content when a text search or speaker filter is supplied.
type contentSearch struct {
	Type       *dbgen.ContentType
	CategoryID pgtype.UUID
	Q          *string // nil = no text search
	Speaker    *string // nil = any; pointer to "" = items with no speaker
	Limit      int32
	Offset     int32
}

// hasSearchParams reports whether the request uses the new search/speaker filters.
// Plain list requests keep their original code path untouched.
func hasSearchParams(v url.Values) bool {
	return strings.TrimSpace(v.Get("q")) != "" || v.Has("speaker")
}

// pageParams reads limit (default 20, max 100) and offset (default 0).
func pageParams(v url.Values) (limit, offset int32) {
	limit = 20
	if n, err := strconv.Atoi(v.Get("limit")); err == nil && n > 0 {
		limit = int32(min(n, 100))
	}
	if n, err := strconv.Atoi(v.Get("offset")); err == nil && n >= 0 {
		offset = int32(n)
	}
	return limit, offset
}

func parseContentSearch(v url.Values) (contentSearch, error) {
	s := contentSearch{}
	s.Limit, s.Offset = pageParams(v)

	if t := v.Get("type"); t != "" {
		ct := dbgen.ContentType(t)
		if !validContentTypes[ct] {
			return s, errors.New("invalid type parameter")
		}
		s.Type = &ct
	}
	if c := v.Get("category_id"); c != "" {
		if err := s.CategoryID.Scan(c); err != nil {
			return s, errors.New("invalid category_id")
		}
	}
	if q := strings.TrimSpace(v.Get("q")); q != "" {
		if r := []rune(q); len(r) > maxSearchRunes {
			q = string(r[:maxSearchRunes])
		}
		s.Q = &q
	}
	if v.Has("speaker") {
		sp := strings.TrimSpace(v.Get("speaker"))
		s.Speaker = &sp
	}
	return s, nil
}

type speakerFacet struct {
	Key    string `json:"key"`
	NameEn string `json:"name_en"`
	NameUr string `json:"name_ur"`
	Count  int64  `json:"count"`
}

// ContentFacets godoc
//	@Summary		Filter options for content
//	@Description	Distinct speakers and the categories that have content, optionally scoped by type or category_id.
//	@Tags			content
//	@Produce		json
//	@Router			/content/facets [get]
func ContentFacets(pool *pgxpool.Pool) http.HandlerFunc {
	q := dbgen.New(pool)
	return func(w http.ResponseWriter, r *http.Request) {
		s, err := parseContentSearch(r.URL.Query())
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		sp, err := q.ContentSpeakerFacets(r.Context(), dbgen.ContentSpeakerFacetsParams{Type: s.Type, CategoryID: s.CategoryID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		cats, err := q.ContentCategoryFacets(r.Context(), dbgen.ContentCategoryFacetsParams{Type: s.Type, CategoryID: s.CategoryID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error")
			return
		}
		speakers := make([]speakerFacet, 0, len(sp))
		for _, row := range sp {
			speakers = append(speakers, speakerFacet{Key: row.SpeakerKey, NameEn: row.NameEn, NameUr: row.NameUr, Count: row.Total})
		}
		catIDs := make([]string, 0, len(cats))
		for _, c := range cats {
			catIDs = append(catIDs, uuidString(c.CategoryID))
		}
		writeJSON(w, http.StatusOK, map[string]any{"speakers": speakers, "category_ids": catIDs})
	}
}
